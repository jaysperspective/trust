import type { LintReport } from './types'

const OVERCONFIDENT_PHRASES: [RegExp, string][] = [
  [/\beveryone knows\b/gi, 'a common assumption holds'],
  [/\bno one can deny\b/gi, 'it would be difficult to argue against'],
  [/\bit'?s certain that\b/gi, 'the evidence strongly indicates'],
  [/\bwithout question\b/gi, 'with high confidence'],
  [/\bdefinitively proves?\b/gi, 'strongly supports'],
  [/\bunquestionably\b/gi, 'with notable consistency'],
  [/\bundeniably\b/gi, 'the data suggests'],
  [/\bobviously\b/gi, 'it appears'],
  [/\bclearly\b/gi, 'based on available evidence'],
  [/\babsolutely\b(?!\s+(?:not|no|nothing|none|never))/gi, ''],
]

export function lintOverconfidence(text: string): LintReport {
  const replacements: LintReport['replacements'] = []
  let cleanedText = text

  for (const [pattern, replacement] of OVERCONFIDENT_PHRASES) {
    cleanedText = cleanedText.replace(pattern, (match) => {
      replacements.push({ original: match, replacement: replacement || '(removed)' })
      return replacement
    })
  }

  // Clean up any double spaces left by removals
  cleanedText = cleanedText.replace(/ {2,}/g, ' ').trim()

  return {
    originalText: text,
    cleanedText,
    replacements,
    flagCount: replacements.length,
  }
}
