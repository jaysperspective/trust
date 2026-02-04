import type { LLMProvider, LLMGenerateOptions, LLMGenerateResult } from './types'
import { OpenAIProvider } from './providers/openai'
import { AnthropicProvider } from './providers/anthropic'

class LLMClient {
  private provider: LLMProvider | null = null

  private getProvider(): LLMProvider {
    if (this.provider) {
      return this.provider
    }

    const providerName = process.env.LLM_PROVIDER || 'openai'

    switch (providerName.toLowerCase()) {
      case 'anthropic':
        this.provider = new AnthropicProvider()
        break
      case 'openai':
      default:
        this.provider = new OpenAIProvider()
        break
    }

    return this.provider
  }

  async generate(options: LLMGenerateOptions): Promise<LLMGenerateResult> {
    const provider = this.getProvider()
    return provider.generate(options)
  }

  get providerName(): string {
    return this.getProvider().name
  }
}

// Singleton instance
export const llmClient = new LLMClient()
