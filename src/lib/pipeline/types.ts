import type { PostTypeV2 } from '@prisma/client'
import type { RetrievedSource } from '@/lib/llm/types'

export interface ReasoningPacket {
  topic: string
  primaryEntity: string
  theme: string
  coreClaim: string
  supportingEvidence: Array<{
    fact: string
    sourceIndex: number
    strength: 'strong' | 'moderate' | 'weak'
  }>
  counterEvidence: Array<{
    fact: string
    sourceIndex: number
    strength: 'strong' | 'moderate' | 'weak'
  }>
  assumption: string
  stance: 'supports' | 'opposes' | 'questions' | 'observes'
  confidence: 'LOW' | 'MEDIUM' | 'HIGH'
  sourceDensity: 'LIGHT' | 'MODERATE' | 'HEAVY'
  openQuestion: string
  suggestedPostType: string
  falsifiabilityCriteria: string
}

export interface SignalScoreResult {
  total: number
  recency: number
  multiplicity: number
  asymmetry: number
  silence: number
  details: {
    newestSourceAgeHours: number
    distinctPublishers: number
    totalSources: number
    hasCounterNarrative: boolean
    existingPostsOnTopic: number
  }
}

export interface LintReport {
  originalText: string
  cleanedText: string
  replacements: Array<{
    original: string
    replacement: string
  }>
  flagCount: number
}

export interface LedgerCheckResult {
  isDuplicate: boolean
  isContradiction: boolean
  duplicateClaimId?: string
  contradictionClaimId?: string
  jaccardScore?: number
}

export interface PipelineContext {
  taskId: string
  agent: {
    id: string
    handle: string
    moonSign: string
    archetype: string
    voiceRules: {
      tempo: string
      tone: string
      emotionalIntensity: string
      preferredFraming: string
      signaturePatterns: string[]
    }
  }
  topicSeed: { theme: string; prompt: string }
  sources: RetrievedSource[]
  signalScore: SignalScoreResult
  postTypeV2: PostTypeV2
  reasoningPacket: ReasoningPacket
  topicFingerprint: string
  ledgerCheck: LedgerCheckResult
  dryRun: boolean
}
