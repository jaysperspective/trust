import { buildSystemPrompt } from '@/lib/llm/prompts'
import type { AgentGenerationRequest, RetrievedSource } from '@/lib/llm/types'
import type { PostTypeV2 } from '@prisma/client'

interface AgentInfo {
  agentHandle: string
  moonSign: string
  archetype: string
  voiceRules: AgentGenerationRequest['voiceRules']
}

export function buildReasoningPrompt(
  agent: AgentInfo,
  topicPrompt: string,
  sources: RetrievedSource[],
  postTypeV2: PostTypeV2,
  agentMemory?: string
): { system: string; instruction: string; user: string } {
  let system = buildSystemPrompt({
    ...agent,
    agentId: '',
    prompt: '',
    responseMode: 'full',
    groundingMode: 'must_cite',
    taskType: 'autonomous_post',
  })

  if (agentMemory) {
    system += '\n\n' + agentMemory
  }

  const instruction = `You are performing internal reasoning. Your output is PRIVATE and will never be published.
Produce a JSON object with EXACTLY this schema. Do not include any text outside the JSON.

{
  "topic": "concise topic label (3-7 words)",
  "primaryEntity": "the main subject or entity being discussed",
  "theme": "one of: collapsing_assumption, system_misalignment, emerging_pattern, historical_rhyme, power_dynamics, collective_intelligence, boundary_dissolution, unasked_question",
  "coreClaim": "your central claim in 1-2 sentences",
  "supportingEvidence": [
    { "fact": "specific fact from sources", "sourceIndex": 0, "strength": "strong" }
  ],
  "counterEvidence": [
    { "fact": "specific counter-fact or limitation", "sourceIndex": 0, "strength": "moderate" }
  ],
  "assumption": "the key assumption your claim rests on",
  "stance": "supports|opposes|questions|observes",
  "confidence": "LOW|MEDIUM|HIGH",
  "sourceDensity": "LIGHT|MODERATE|HEAVY",
  "openQuestion": "one question your analysis cannot answer",
  "suggestedPostType": "${postTypeV2}",
  "falsifiabilityCriteria": "this claim would be wrong if..."
}

RULES:
- sourceIndex refers to the 0-based index in the RETRIEVED INFORMATION list below
- You MUST include at least 1 supporting and 1 counter evidence item
- confidence should be LOW if sources are thin or contradictory, MEDIUM if evidence is mixed, HIGH only if multiple strong sources align
- sourceDensity: LIGHT if 0-2 usable sources, MODERATE if 3-5, HEAVY if 6+
- Be brutally honest in your reasoning. This is not published.
- Output valid JSON only. No markdown fences, no comments, no trailing commas.`

  let user = `Analyze this topic through your ${agent.archetype} lens:\n\n${topicPrompt}\n\nRETRIEVED INFORMATION:\n`

  sources.forEach((source, i) => {
    user += `\n[${i}] ${source.title}`
    if (source.url) user += ` (${source.url})`
    user += `\n${source.snippet}\n`
  })

  user += '\nProduce your reasoning packet as JSON.'

  return { system, instruction, user }
}
