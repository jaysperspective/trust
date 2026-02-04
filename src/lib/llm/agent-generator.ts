import { llmClient } from './client'
import type { AgentGenerationRequest, AgentGenerationResult } from './types'
import { buildSystemPrompt, buildInstructionPrompt, buildUserPrompt } from './prompts'

export async function generateAgentContent(
  request: AgentGenerationRequest
): Promise<AgentGenerationResult> {
  const systemPrompt = buildSystemPrompt(request)
  const instructionPrompt = buildInstructionPrompt(request)
  const userPrompt = buildUserPrompt(request)

  const result = await llmClient.generate({
    system: systemPrompt,
    instruction: instructionPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ],
    maxTokens: request.responseMode === 'short' ? 600 : 1200,
    temperature: 0.7
  })

  // Parse the structured response
  return parseAgentResponse(result.content)
}

function parseAgentResponse(rawContent: string): AgentGenerationResult {
  // Default values
  let coreClaim = ''
  let assumption = ''
  let take = ''
  let question = ''
  const sources: { title: string; url?: string; snippet?: string }[] = []

  const lines = rawContent.split('\n')
  let currentSection = 'claim'
  let takeLines: string[] = []

  for (const line of lines) {
    const trimmedLine = line.trim()

    // Check for section markers
    if (trimmedLine.toLowerCase().startsWith('assumption:')) {
      coreClaim = takeLines.join(' ').trim()
      takeLines = []
      assumption = trimmedLine.replace(/^assumption:\s*/i, '').trim()
      currentSection = 'take'
      continue
    }

    if (trimmedLine.toLowerCase().startsWith('question:')) {
      take = takeLines.join('\n').trim()
      takeLines = []
      question = trimmedLine.replace(/^question:\s*/i, '').trim()
      currentSection = 'sources'
      continue
    }

    if (
      trimmedLine.toLowerCase().startsWith('sources:') ||
      trimmedLine.toLowerCase().startsWith('source:')
    ) {
      if (take === '') {
        take = takeLines.join('\n').trim()
        takeLines = []
      }
      currentSection = 'sources'
      continue
    }

    // Parse source bullets
    if (currentSection === 'sources' && trimmedLine.startsWith('-')) {
      const sourceText = trimmedLine.substring(1).trim()
      const urlMatch = sourceText.match(/\((https?:\/\/[^\s)]+)\)/)
      const url = urlMatch ? urlMatch[1] : undefined
      const title = sourceText.replace(/\([^)]*\)/g, '').trim()

      sources.push({ title, url })
      continue
    }

    // Accumulate content for current section
    if (trimmedLine) {
      takeLines.push(trimmedLine)
    } else if (takeLines.length > 0 && currentSection === 'take') {
      takeLines.push('') // Preserve paragraph breaks
    }
  }

  // Handle edge cases where sections weren't clearly delimited
  if (coreClaim === '' && takeLines.length > 0) {
    // Try to extract the first sentence as core claim
    const fullText = takeLines.join(' ')
    const firstSentenceEnd = fullText.search(/[.!?]/) + 1
    if (firstSentenceEnd > 0) {
      coreClaim = fullText.substring(0, firstSentenceEnd).trim()
      take = fullText.substring(firstSentenceEnd).trim()
    } else {
      take = fullText
    }
  }

  // Clean up take formatting
  take = take
    .split('\n')
    .filter((line, index, arr) => {
      // Remove consecutive empty lines
      if (line === '' && index > 0 && arr[index - 1] === '') {
        return false
      }
      return true
    })
    .join('\n')
    .trim()

  return {
    coreClaim,
    assumption,
    take,
    question,
    sources,
    rawContent
  }
}

// Generate a title from the content
export function generateTitle(content: AgentGenerationResult, archetype: string): string {
  // Try to create a compelling title from the core claim
  if (content.coreClaim) {
    // Truncate if too long
    if (content.coreClaim.length <= 80) {
      return content.coreClaim
    }
    // Find a good break point
    const words = content.coreClaim.split(' ')
    let title = ''
    for (const word of words) {
      if ((title + ' ' + word).length > 75) break
      title = title ? title + ' ' + word : word
    }
    return title + '...'
  }

  // Fallback to archetype-based generic title
  return `${archetype}: Emerging Patterns`
}

// Generate an excerpt
export function generateExcerpt(content: AgentGenerationResult): string {
  const text = content.take || content.coreClaim || content.rawContent
  if (text.length <= 200) return text

  // Find a good break point
  const truncated = text.substring(0, 200)
  const lastSpace = truncated.lastIndexOf(' ')
  return truncated.substring(0, lastSpace) + '...'
}
