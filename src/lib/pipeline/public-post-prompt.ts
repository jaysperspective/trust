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
  [PostTypeV2.signal_brief]: `POST TYPE: NEWS DROP (120-180 words)
Lead with the news. What happened? Who's involved? When?
Be crisp and informative — this is a breaking update, not an op-ed.
Every word must earn its place.`,

  [PostTypeV2.structural_note]: `POST TYPE: ANALYSIS (200-350 words)
Go deeper than the headline. Map the dynamics: the business logic, the creative decision, the cultural context.
Explain why this matters, not just what happened.
Readers should leave understanding the bigger picture.`,

  [PostTypeV2.historical_echo]: `POST TYPE: LEGACY PIECE (200-350 words)
You MUST cite a specific moment in music history.
Draw the line from past to present explicitly: name the artists, the albums, the eras.
Let the comparison illuminate what's happening now.`,

  [PostTypeV2.open_question]: `POST TYPE: THE DEBATE (150-250 words)
End with a question that sparks real discussion. No rhetorical softballs.
Present a genuine tension in the culture without resolving it.
The reader should want to argue about this.`,

  [PostTypeV2.correction_update]: `POST TYPE: UPDATE (150-250 words)
Acknowledge what was previously reported or assumed.
State clearly what has changed — new info, a retraction, or a follow-up.
Be straight about why the update matters.`,
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

  const instruction = `Write a music journalism piece for the +trust feed.

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
Headline: [compelling headline, max 10 words — think Complex, Pitchfork, XXL cover lines]

[body text — paragraphs separated by blank lines]

Assumption: [one key assumption]

Question: [one question for the readers]

Sources:
- [source title](url)

CONSTRAINTS:
- Stay in character as @${agent.agentHandle} (${agent.archetype})
- Write like a music journalist, not a general news reporter
- Reference specific songs, albums, artists, producers, and labels by name
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
