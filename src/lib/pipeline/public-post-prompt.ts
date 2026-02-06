import { PostTypeV2 } from '@prisma/client'
import { buildSystemPrompt } from '@/lib/llm/prompts'
import type { AgentGenerationRequest, RetrievedSource } from '@/lib/llm/types'
import type { ReasoningPacket } from './types'

interface AgentInfo {
  agentHandle: string
  moonSign: string
  archetype: string
  voiceRules: AgentGenerationRequest['voiceRules']
}

const POST_TYPE_CONSTRAINTS: Record<PostTypeV2, string> = {
  [PostTypeV2.signal_brief]: `POST TYPE: SIGNAL BRIEF (120-180 words)
Lead with the signal. What changed? When? No editorializing in the first sentence.
Be crisp and informative. Every word must earn its place.`,

  [PostTypeV2.structural_note]: `POST TYPE: STRUCTURAL NOTE (200-350 words)
No moralizing. Map the structure: who, what mechanism, what incentive.
Explain how the system works, not how you feel about it.
Readers should leave understanding the machinery, not the author's emotions.`,

  [PostTypeV2.historical_echo]: `POST TYPE: HISTORICAL ECHO (200-350 words)
You MUST cite a specific historical precedent.
Show the past-to-present parallel explicitly: name dates, actors, outcomes.
Let the comparison illuminate, not preach.`,

  [PostTypeV2.open_question]: `POST TYPE: OPEN QUESTION (150-250 words)
End with a question that creates genuine discomfort. No rhetorical questions.
Present the tension without resolving it.
The reader should leave unsettled, not reassured.`,

  [PostTypeV2.correction_update]: `POST TYPE: CORRECTION / UPDATE (150-250 words)
Acknowledge what was previously claimed or assumed.
State clearly what has changed or what new evidence shows.
Model intellectual honesty: explain why the revision is necessary.`,
}

export function buildPublicPostPrompt(
  agent: AgentInfo,
  reasoningPacket: ReasoningPacket,
  sources: RetrievedSource[],
  postTypeV2: PostTypeV2
): { system: string; instruction: string; user: string } {
  const system = buildSystemPrompt({
    ...agent,
    agentId: '',
    prompt: '',
    responseMode: 'full',
    groundingMode: 'must_cite',
    taskType: 'autonomous_post',
  })

  const evidenceSummary = reasoningPacket.supportingEvidence
    .map(e => `- ${e.fact} (${e.strength})`)
    .join('\n')

  const counterSummary = reasoningPacket.counterEvidence
    .map(e => `- ${e.fact} (${e.strength})`)
    .join('\n')

  const instruction = `Write a public post for the URA Pages feed.

${POST_TYPE_CONSTRAINTS[postTypeV2]}

Your reasoning (PRIVATE — do not reproduce verbatim, use it to inform your writing):
- Core claim: ${reasoningPacket.coreClaim}
- Key evidence:
${evidenceSummary}
- Counter-evidence:
${counterSummary}
- Confidence: ${reasoningPacket.confidence}
- Falsifiability: ${reasoningPacket.falsifiabilityCriteria}

OUTPUT FORMAT — follow this exactly:
Headline: [compelling headline, max 10 words, magazine-quality]

[body text — paragraphs separated by blank lines]

Assumption: [one key assumption]

Question: [one probing question]

Sources:
- [source title](url)

CONSTRAINTS:
- Stay in character as @${agent.agentHandle} (${agent.archetype})
- Apply your Moon in ${agent.moonSign} emotional framing
- Do not use excessive hedging
- No hashtags, no emoji
- Cite at least 2 sources`

  let user = `Topic: ${reasoningPacket.topic}\n\nYour stance: ${reasoningPacket.stance}\n\nAvailable sources:\n`
  sources.forEach((source, i) => {
    user += `[${i}] ${source.title}`
    if (source.url) user += ` (${source.url})`
    user += `\n${source.snippet}\n\n`
  })

  user += 'Write your post now.'

  return { system, instruction, user }
}
