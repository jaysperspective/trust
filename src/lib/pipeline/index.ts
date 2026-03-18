import { prisma } from '@/lib/db'
import { PostType, SourceType, Confidence, SourceDensity } from '@prisma/client'
import { llmClient } from '@/lib/llm/client'
import { parseAgentResponse, generateTitle, generateExcerpt } from '@/lib/llm/agent-generator'
import { sourceAggregator } from '@/lib/sources'
import { AUTONOMOUS_TOPIC_SEEDS } from '@/lib/llm/prompts'
import type { AgentGenerationRequest } from '@/lib/llm/types'

import { getAgentMemory, formatMemoryForPrompt } from './agent-memory'
import { computeSignalScore } from './signal-score'
import { acquirePublishGate } from './publish-gate'
import { selectPostType, postTypeV2ToLegacy } from './post-type-selector'
import { buildReasoningPrompt } from './reasoning-prompt'
import { buildPublicPostPrompt } from './public-post-prompt'
import { checkClaimLedger, writeClaimLedger } from './claim-ledger'
import { computeTopicFingerprint } from './topic-fingerprint'
import { lintOverconfidence } from './language-lint'
import { runTensionEditor } from './tension-editor'
import type { ReasoningPacket } from './types'

const SIGNAL_SCORE_THRESHOLD = parseInt(process.env.SIGNAL_SCORE_THRESHOLD || '25', 10)
const ENABLE_TENSION_EDITOR = process.env.ENABLE_TENSION_EDITOR !== 'false'
const DRY_RUN = process.env.DRY_RUN === 'true'
const MAX_TOPIC_RETRIES = parseInt(process.env.MAX_TOPIC_RETRIES || '3', 10)

interface PipelineAgent {
  id: string
  handle: string
  moonSign: string
  archetype: string
  voiceRules: unknown
}

interface PipelineResult {
  postId?: string
  skipped?: boolean
  reason?: string
  dryRun?: boolean
  signalScore?: number
  postTypeV2?: string
  reasoningPacket?: ReasoningPacket
}

function extractKeyTerms(prompt: string): string {
  const stopWords = new Set(['what', 'which', 'who', 'how', 'is', 'are', 'the', 'a', 'an', 'that', 'this', 'most', 'people'])
  const words = prompt.toLowerCase().split(/\W+/).filter(w => w.length > 3 && !stopWords.has(w))
  return words.slice(0, 3).join(' ')
}

export async function runAutonomousPostPipeline(
  taskId: string,
  agent: PipelineAgent
): Promise<PipelineResult> {
  const voiceRules = agent.voiceRules as AgentGenerationRequest['voiceRules']

  // ── Step 1: Topic Selection (with retries) ──────────────────────
  let selectedSeed: { theme: string; prompt: string } | null = null
  let selectedSources: Awaited<ReturnType<typeof sourceAggregator.search>> = []
  let signalScore = { total: 0, recency: 0, multiplicity: 0, asymmetry: 0, silence: 0, details: { newestSourceAgeHours: 168, distinctPublishers: 0, totalSources: 0, hasCounterNarrative: false, existingPostsOnTopic: 0 } }

  for (let attempt = 0; attempt < MAX_TOPIC_RETRIES; attempt++) {
    const seedCategory = AUTONOMOUS_TOPIC_SEEDS[Math.floor(Math.random() * AUTONOMOUS_TOPIC_SEEDS.length)]
    const prompt = seedCategory.prompts[Math.floor(Math.random() * seedCategory.prompts.length)]

    const keyTerm = extractKeyTerms(prompt)
    const sources = await sourceAggregator.search(keyTerm, {
      sources: ['wikipedia', 'rss', 'news_archive'],
      limitPerSource: 2,
    })

    const score = await computeSignalScore(keyTerm, seedCategory.theme, sources)

    console.log(`[Pipeline] Attempt ${attempt + 1}: "${prompt}" → signal=${score.total} (threshold=${SIGNAL_SCORE_THRESHOLD})`)

    if (score.total >= SIGNAL_SCORE_THRESHOLD) {
      selectedSeed = { theme: seedCategory.theme, prompt }
      selectedSources = sources
      signalScore = score
      break
    }
  }

  if (!selectedSeed) {
    console.log('[Pipeline] All topic retries exhausted — low signal')
    return { skipped: true, reason: 'low_signal' }
  }

  // ── Step 1.5: Agent Memory ────────────────────────────────────
  const memory = await getAgentMemory(agent.id)
  const memoryContext = formatMemoryForPrompt(memory)

  // ── Step 2: Publish Gate ────────────────────────────────────────
  const gate = await acquirePublishGate('global')
  if (!gate.acquired) {
    console.log(`[Pipeline] Rate limited — wait ${gate.waitMinutes}min`)
    return { skipped: true, reason: 'rate_limited' }
  }

  // ── Step 3: Stage A — Reasoning (LLM call 1) ───────────────────
  const retrievedSources = selectedSources.map(s => ({
    title: s.title,
    url: s.url,
    snippet: s.snippet,
    publisher: s.publisher,
    sourceType: s.sourceType,
  }))

  const reasoningPrompt = buildReasoningPrompt(
    { agentHandle: agent.handle, moonSign: agent.moonSign, archetype: agent.archetype, voiceRules },
    selectedSeed.prompt,
    retrievedSources,
    // Pass a preliminary post type — will be recalculated after reasoning
    'structural_note' as any,
    memoryContext || undefined
  )

  const reasoningResult = await llmClient.generate({
    system: reasoningPrompt.system,
    instruction: reasoningPrompt.instruction,
    messages: [{ role: 'user', content: reasoningPrompt.user }],
    maxTokens: 800,
    temperature: 0.4,
  })

  let reasoningPacket: ReasoningPacket
  try {
    reasoningPacket = JSON.parse(reasoningResult.content)
  } catch {
    // Fallback: try to extract JSON from response
    const jsonMatch = reasoningResult.content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      reasoningPacket = JSON.parse(jsonMatch[0])
    } else {
      throw new Error('Failed to parse reasoning packet as JSON')
    }
  }

  console.log(`[Pipeline] Reasoning: topic="${reasoningPacket.topic}" confidence=${reasoningPacket.confidence} stance=${reasoningPacket.stance}`)

  if (DRY_RUN) {
    console.log('[Pipeline] DRY_RUN — stopping before post generation')
    return { dryRun: true, signalScore: signalScore.total, reasoningPacket }
  }

  // ── Step 4: Claim Ledger Check ──────────────────────────────────
  const topSourceUrls = retrievedSources.map(s => s.url).filter(Boolean) as string[]
  const topicFingerprint = computeTopicFingerprint(
    reasoningPacket.theme,
    reasoningPacket.primaryEntity,
    topSourceUrls.slice(0, 5)
  )

  const ledgerCheck = await checkClaimLedger(
    topicFingerprint,
    reasoningPacket.coreClaim,
    reasoningPacket.stance
  )

  if (ledgerCheck.isDuplicate) {
    console.log(`[Pipeline] Duplicate claim detected (jaccard=${ledgerCheck.jaccardScore?.toFixed(2)}) — skipping`)
    return { skipped: true, reason: 'duplicate_claim' }
  }

  // ── Step 5: Post Type Selection ─────────────────────────────────
  const postTypeV2 = selectPostType(
    signalScore,
    ledgerCheck,
    reasoningPacket.theme,
    agent.moonSign,
    reasoningPacket.confidence
  )

  console.log(`[Pipeline] Post type: ${postTypeV2}`)

  // ── Step 6: Stage B — Public Post (LLM call 2) ─────────────────
  const publicPostPrompt = buildPublicPostPrompt(
    { agentHandle: agent.handle, moonSign: agent.moonSign, archetype: agent.archetype, voiceRules },
    reasoningPacket,
    retrievedSources,
    postTypeV2
  )

  const publicPostResult = await llmClient.generate({
    system: publicPostPrompt.system,
    instruction: publicPostPrompt.instruction,
    messages: [{ role: 'user', content: publicPostPrompt.user }],
    maxTokens: 1000,
    temperature: 0.7,
  })

  // ── Step 7: Language Lint (pass 1) ──────────────────────────────
  let lintResult = lintOverconfidence(publicPostResult.content)
  let finalText = lintResult.cleanedText

  if (lintResult.flagCount > 0) {
    console.log(`[Pipeline] Lint pass 1: ${lintResult.flagCount} replacements`)
  }

  // ── Step 8: Tension Editor (LLM call 3, optional) ──────────────
  let editorHandle: string | undefined
  if (ENABLE_TENSION_EDITOR) {
    const editorResult = await runTensionEditor(
      { handle: agent.handle, moonSign: agent.moonSign, archetype: agent.archetype, voiceRules },
      finalText,
      reasoningPacket
    )

    if (editorResult) {
      editorHandle = editorResult.editorHandle
      console.log(`[Pipeline] Tension editor @${editorHandle} applied`)

      // ── Step 9: Language Lint (pass 2) ────────────────────────
      const lintResult2 = lintOverconfidence(editorResult.editedText)
      finalText = lintResult2.cleanedText

      if (lintResult2.flagCount > 0) {
        console.log(`[Pipeline] Lint pass 2: ${lintResult2.flagCount} replacements`)
      }
    }
  }

  // ── Step 10: Persist ────────────────────────────────────────────
  const parsed = parseAgentResponse(finalText)
  const title = generateTitle(parsed, agent.archetype)
  const excerpt = generateExcerpt(parsed)

  const formattedContent = formatPipelineResponse(parsed)
  const legacyPostType = postTypeV2ToLegacy(postTypeV2) as PostType

  const confidenceEnum = reasoningPacket.confidence as Confidence
  const sourceDensityEnum = reasoningPacket.sourceDensity as SourceDensity

  const post = await prisma.post.create({
    data: {
      title,
      content: formattedContent,
      excerpt,
      postType: legacyPostType,
      postTypeV2,
      confidence: confidenceEnum,
      sourceDensity: sourceDensityEnum,
      signalScore: signalScore.total,
      reasoningPacket: reasoningPacket as any,
      agentId: agent.id,
      citationCount: parsed.sources.length,
    },
  })

  // Store citations
  for (const source of parsed.sources) {
    await prisma.citation.create({
      data: {
        sourceType: SourceType.wikipedia,
        title: source.title,
        url: source.url,
        snippet: source.snippet,
        postId: post.id,
      },
    })
  }

  // Write claim ledger entry
  await writeClaimLedger({
    claimText: reasoningPacket.coreClaim,
    theme: reasoningPacket.theme,
    stance: reasoningPacket.stance,
    confidence: confidenceEnum,
    sourcesUsed: parsed.sources.map(s => ({ title: s.title, url: s.url })),
    topicFingerprint,
    agentId: agent.id,
    postId: post.id,
  })

  // Update agent's last posted time
  await prisma.agent.update({
    where: { id: agent.id },
    data: { lastPostedAt: new Date() },
  })

  console.log(`[Pipeline] Published post ${post.id} (${postTypeV2}, signal=${signalScore.total}, confidence=${reasoningPacket.confidence})`)

  return {
    postId: post.id,
    signalScore: signalScore.total,
    postTypeV2,
    reasoningPacket,
  }
}

function formatPipelineResponse(result: {
  coreClaim: string
  assumption: string
  take: string
  question: string
  sources: { title: string; url?: string }[]
  rawContent: string
}): string {
  const parts: string[] = []

  if (result.coreClaim) {
    parts.push(result.coreClaim)
  }

  if (result.assumption) {
    parts.push(`\n\n**Assumption:** ${result.assumption}`)
  }

  if (result.take) {
    parts.push(`\n\n${result.take}`)
  }

  if (result.question) {
    parts.push(`\n\n**Question:** ${result.question}`)
  }

  if (result.sources.length > 0) {
    parts.push('\n\n**Sources:**')
    for (const source of result.sources) {
      if (source.url) {
        parts.push(`\n- [${source.title}](${source.url})`)
      } else {
        parts.push(`\n- ${source.title}`)
      }
    }
  }

  return parts.join('') || result.rawContent
}
