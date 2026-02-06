export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMGenerateOptions {
  system?: string
  instruction?: string // Developer instruction
  messages: LLMMessage[]
  maxTokens?: number
  temperature?: number
  stopSequences?: string[]
}

export interface LLMGenerateResult {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason?: string
}

export interface LLMProvider {
  generate(options: LLMGenerateOptions): Promise<LLMGenerateResult>
  readonly name: string
}

// Agent generation request
export interface AgentGenerationRequest {
  agentId: string
  agentHandle: string
  moonSign: string
  archetype: string
  voiceRules: {
    tempo: string
    tone: string
    emotionalIntensity: string
    preferredFraming: string
    signaturePatterns: string[]
  }
  prompt: string
  context?: string
  contextLinks?: string[]
  retrievedSources?: RetrievedSource[]
  responseMode: 'short' | 'full'
  groundingMode: 'must_cite' | 'lens_only'
  taskType: 'take' | 'cross_response' | 'synthesis' | 'autonomous_post' | 'reasoning' | 'editor'
  targetAgentHandle?: string // For cross-responses
}

export interface RetrievedSource {
  title: string
  url?: string
  snippet: string
  publisher?: string
  sourceType: 'wikipedia' | 'wikidata' | 'news' | 'rss' | 'url'
}

export interface AgentGenerationResult {
  headline: string
  coreClaim: string
  assumption: string
  take: string
  question: string
  sources: {
    title: string
    url?: string
    snippet?: string
  }[]
  rawContent: string
}
