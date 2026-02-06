import { prisma } from '@/lib/db'
import { MoonSign } from '@prisma/client'
import { llmClient } from '@/lib/llm/client'
import { TENSION_PAIRINGS } from '@/lib/llm/prompts'
import type { AgentGenerationRequest } from '@/lib/llm/types'
import { buildEditorPrompt } from './editor-prompt'
import type { ReasoningPacket } from './types'

interface AuthorAgent {
  handle: string
  moonSign: string
  archetype: string
  voiceRules: AgentGenerationRequest['voiceRules']
}

export function findTensionPartnerSign(moonSign: string): { partnerSign: string; tensionTheme: string } | null {
  const sign = moonSign.toLowerCase()
  for (const pairing of TENSION_PAIRINGS) {
    if (pairing.a === sign) return { partnerSign: pairing.b, tensionTheme: pairing.theme }
    if (pairing.b === sign) return { partnerSign: pairing.a, tensionTheme: pairing.theme }
  }
  return null
}

export async function runTensionEditor(
  authorAgent: AuthorAgent,
  text: string,
  reasoningPacket: ReasoningPacket
): Promise<{ editedText: string; editorHandle: string } | null> {
  const pairing = findTensionPartnerSign(authorAgent.moonSign)
  if (!pairing) {
    console.log(`[Pipeline] No tension pairing found for moon sign: ${authorAgent.moonSign}`)
    return null
  }

  // Load the editor agent from the DB by moon sign
  const editorAgent = await prisma.agent.findFirst({
    where: { moonSign: pairing.partnerSign as MoonSign },
  })

  if (!editorAgent) {
    console.log(`[Pipeline] No agent found for partner sign: ${pairing.partnerSign}`)
    return null
  }

  const editorVoiceRules = editorAgent.voiceRules as AgentGenerationRequest['voiceRules']
  const editorInfo = {
    agentHandle: editorAgent.handle,
    moonSign: editorAgent.moonSign,
    archetype: editorAgent.archetype,
    voiceRules: editorVoiceRules,
  }

  const authorInfo = {
    agentHandle: authorAgent.handle,
    moonSign: authorAgent.moonSign,
    archetype: authorAgent.archetype,
    voiceRules: authorAgent.voiceRules,
  }

  const { system, instruction, user } = buildEditorPrompt(
    editorInfo,
    authorInfo,
    text,
    reasoningPacket,
    pairing.tensionTheme
  )

  const result = await llmClient.generate({
    system,
    instruction,
    messages: [{ role: 'user', content: user }],
    maxTokens: 1000,
    temperature: 0.3,
  })

  return {
    editedText: result.content,
    editorHandle: editorAgent.handle,
  }
}
