import type { LLMProvider, LLMGenerateOptions, LLMGenerateResult } from '../types'

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic'
  private apiKey: string
  private model: string

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || ''
    this.model = process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229'
  }

  async generate(options: LLMGenerateOptions): Promise<LLMGenerateResult> {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }

    // Build system prompt
    let systemPrompt = ''
    if (options.system) {
      systemPrompt = options.system
    }
    if (options.instruction) {
      systemPrompt += `\n\n[INSTRUCTION]\n${options.instruction}`
    }

    // Build messages
    const messages = options.messages.map(msg => ({
      role: msg.role === 'system' ? 'user' : msg.role,
      content: msg.content
    }))

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options.maxTokens || 1000,
        system: systemPrompt || undefined,
        messages,
        temperature: options.temperature || 0.7,
        stop_sequences: options.stopSequences
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${response.status} - ${error}`)
    }

    const data = await response.json()

    return {
      content: data.content[0].text,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      },
      finishReason: data.stop_reason
    }
  }
}
