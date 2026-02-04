import type { LLMProvider, LLMGenerateOptions, LLMGenerateResult } from '../types'

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai'
  private apiKey: string
  private model: string

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || ''
    this.model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview'
  }

  async generate(options: LLMGenerateOptions): Promise<LLMGenerateResult> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    const messages = []

    // System message
    if (options.system) {
      messages.push({
        role: 'system',
        content: options.system
      })
    }

    // Developer instruction (added as system message with developer role if supported)
    if (options.instruction) {
      messages.push({
        role: 'system',
        content: `[INSTRUCTION]\n${options.instruction}`
      })
    }

    // User messages
    for (const msg of options.messages) {
      messages.push({
        role: msg.role,
        content: msg.content
      })
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        stop: options.stopSequences
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    const choice = data.choices[0]

    return {
      content: choice.message.content,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens
      } : undefined,
      finishReason: choice.finish_reason
    }
  }
}
