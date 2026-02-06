import { describe, it, expect } from 'vitest'
import { tokenize, jaccardSimilarity, isContradictoryStance } from '../../src/lib/pipeline/claim-ledger'

describe('tokenize', () => {
  it('removes stop words and normalizes', () => {
    const tokens = tokenize('The Federal Reserve is raising interest rates')
    expect(tokens.has('federal')).toBe(true)
    expect(tokens.has('reserve')).toBe(true)
    expect(tokens.has('raising')).toBe(true)
    expect(tokens.has('interest')).toBe(true)
    expect(tokens.has('rates')).toBe(true)
    // Stop words removed
    expect(tokens.has('the')).toBe(false)
    expect(tokens.has('is')).toBe(false)
  })

  it('filters short words (<=2 chars)', () => {
    const tokens = tokenize('AI is an important field of CS')
    expect(tokens.has('ai')).toBe(false)
    expect(tokens.has('an')).toBe(false)
    expect(tokens.has('cs')).toBe(false)
    expect(tokens.has('important')).toBe(true)
    expect(tokens.has('field')).toBe(true)
  })

  it('lowercases everything', () => {
    const tokens = tokenize('BITCOIN DECLINES Sharply')
    expect(tokens.has('bitcoin')).toBe(true)
    expect(tokens.has('declines')).toBe(true)
    expect(tokens.has('sharply')).toBe(true)
  })
})

describe('jaccardSimilarity', () => {
  it('returns 1.0 for identical sets', () => {
    const a = new Set(['fed', 'rates', 'economy'])
    expect(jaccardSimilarity(a, a)).toBe(1)
  })

  it('returns 0.0 for disjoint sets', () => {
    const a = new Set(['fed', 'rates'])
    const b = new Set(['climate', 'ocean'])
    expect(jaccardSimilarity(a, b)).toBe(0)
  })

  it('computes correct ratio for partial overlap', () => {
    const a = new Set(['fed', 'rates', 'economy'])
    const b = new Set(['fed', 'rates', 'inflation'])
    // intersection=2, union=4
    expect(jaccardSimilarity(a, b)).toBeCloseTo(0.5)
  })

  it('returns 1.0 for two empty sets', () => {
    expect(jaccardSimilarity(new Set(), new Set())).toBe(1)
  })

  it('returns 0.0 when one set is empty', () => {
    expect(jaccardSimilarity(new Set(['a']), new Set())).toBe(0)
  })

  it('detects near-duplicate at threshold boundary', () => {
    // 3 of 5 shared = 3/(5+2) actually let's be precise
    // a={1,2,3,4,5} b={1,2,3,6,7} -> intersection=3, union=7 -> 0.428
    const a = new Set(['federal', 'reserve', 'raising', 'interest', 'rates'])
    const b = new Set(['federal', 'reserve', 'raising', 'bond', 'yields'])
    const similarity = jaccardSimilarity(a, b)
    // intersection=3, union=7
    expect(similarity).toBeCloseTo(3 / 7)
    expect(similarity).toBeLessThan(0.6) // Below duplicate threshold
  })
})

describe('isContradictoryStance', () => {
  it('returns true for supports vs opposes', () => {
    expect(isContradictoryStance('supports', 'opposes')).toBe(true)
    expect(isContradictoryStance('opposes', 'supports')).toBe(true)
  })

  it('returns false for same stance', () => {
    expect(isContradictoryStance('supports', 'supports')).toBe(false)
  })

  it('returns false for non-opposing pairs', () => {
    expect(isContradictoryStance('supports', 'questions')).toBe(false)
    expect(isContradictoryStance('questions', 'observes')).toBe(false)
  })

  it('detects rising vs declining', () => {
    expect(isContradictoryStance('rising', 'declining')).toBe(true)
  })
})
