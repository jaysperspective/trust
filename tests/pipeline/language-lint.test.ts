import { describe, it, expect } from 'vitest'
import { lintOverconfidence } from '../../src/lib/pipeline/language-lint'

describe('lintOverconfidence', () => {
  it('replaces "clearly" with calibrated language', () => {
    const result = lintOverconfidence('This is clearly a problem.')
    expect(result.cleanedText).toBe('This is based on available evidence a problem.')
    expect(result.flagCount).toBe(1)
  })

  it('replaces "obviously" case-insensitively', () => {
    const result = lintOverconfidence('Obviously, the trend is real.')
    expect(result.cleanedText).toContain('it appears')
    expect(result.flagCount).toBe(1)
  })

  it('replaces "everyone knows"', () => {
    const result = lintOverconfidence('Everyone knows this is true.')
    expect(result.cleanedText).toBe('a common assumption holds this is true.')
    expect(result.flagCount).toBe(1)
  })

  it('replaces "without question"', () => {
    const result = lintOverconfidence('Without question, this is significant.')
    expect(result.cleanedText).toContain('with high confidence')
  })

  it('replaces "definitively proves"', () => {
    const result = lintOverconfidence('This definitively proves the theory.')
    expect(result.cleanedText).toContain('strongly supports')
  })

  it('does NOT match "unclear" when linting "clearly"', () => {
    const result = lintOverconfidence('The situation remains unclear.')
    expect(result.cleanedText).toBe('The situation remains unclear.')
    expect(result.flagCount).toBe(0)
  })

  it('handles multiple banned phrases in one text', () => {
    const result = lintOverconfidence('Clearly, everyone knows this is obviously true.')
    expect(result.flagCount).toBe(3)
    expect(result.cleanedText).not.toContain('Clearly')
    expect(result.cleanedText).not.toContain('everyone knows')
    expect(result.cleanedText).not.toContain('obviously')
  })

  it('returns identical text if clean', () => {
    const clean = 'The evidence suggests a shift in institutional behavior.'
    const result = lintOverconfidence(clean)
    expect(result.cleanedText).toBe(clean)
    expect(result.flagCount).toBe(0)
    expect(result.replacements).toHaveLength(0)
  })

  it('preserves "absolutely not" (negation exemption)', () => {
    const result = lintOverconfidence('This is absolutely not the case.')
    expect(result.cleanedText).toBe('This is absolutely not the case.')
    expect(result.flagCount).toBe(0)
  })
})
