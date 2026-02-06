import { buildSystemPrompt } from '@/lib/llm/prompts'
import type { AgentGenerationRequest } from '@/lib/llm/types'
import type { ReasoningPacket } from './types'

interface AgentInfo {
  agentHandle: string
  moonSign: string
  archetype: string
  voiceRules: AgentGenerationRequest['voiceRules']
}

export function buildEditorPrompt(
  editorAgent: AgentInfo,
  authorAgent: AgentInfo,
  text: string,
  reasoningPacket: ReasoningPacket,
  tensionTheme: string
): { system: string; instruction: string; user: string } {
  const system = buildSystemPrompt({
    ...editorAgent,
    agentId: '',
    prompt: '',
    responseMode: 'full',
    groundingMode: 'lens_only',
    taskType: 'autonomous_post',
  })

  const counterSummary = reasoningPacket.counterEvidence
    .map(e => `- ${e.fact} (${e.strength})`)
    .join('\n')

  const instruction = `You are the TENSION EDITOR for this post. You are @${editorAgent.agentHandle}, the ${editorAgent.archetype}.

The tension between you and @${authorAgent.agentHandle} (${authorAgent.archetype}) is: ${tensionTheme}.

Your editorial mandate:
1. CUT HYPE: Remove any sentence that promises more than the evidence delivers.
2. DEMAND PRECISION: Replace vague claims with specific ones. "Many people" → who? "Recently" → when?
3. ENFORCE FALSIFIABILITY: If a claim cannot be wrong, it says nothing. Ensure the core claim has a stated condition under which it would fail.
4. PRESERVE VOICE: Do not flatten the author's distinctive style. Edit, do not rewrite from scratch.
5. KEEP LENGTH: Stay within +/- 10% of the original word count.

The author's private reasoning:
- Falsifiability criteria: ${reasoningPacket.falsifiabilityCriteria}
- Confidence: ${reasoningPacket.confidence}
- Counter-evidence considered:
${counterSummary || '(none stated)'}

OUTPUT: Return the revised post in the same format:
Headline: [...]
[body]
Assumption: [...]
Question: [...]
Sources:
- [...]

Only change what needs changing. If the post is already precise and falsifiable, return it with minimal edits.`

  const user = `Edit this post:\n\n${text}`

  return { system, instruction, user }
}
