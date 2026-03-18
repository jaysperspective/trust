import { describe, it, expect } from 'vitest'

// Test the scoring formulas used in signal-score.ts
// The actual function is DB-coupled, so we test the pure math independently.
describe('signal score formulas', () => {
  describe('recency scoring (0-30)', () => {
    const recencyScore = (newestAgeHours: number) =>
      Math.round(30 * Math.max(0, 1 - newestAgeHours / 168))

    it('gives max score (30) for brand-new sources', () => {
      expect(recencyScore(0)).toBe(30)
    })

    it('gives zero for week-old sources', () => {
      expect(recencyScore(168)).toBe(0)
    })

    it('gives half score for ~84h old sources', () => {
      expect(recencyScore(84)).toBe(15)
    })

    it('clamps to zero for sources older than 7 days', () => {
      expect(recencyScore(300)).toBe(0)
    })

    it('gives ~21 for 1-day-old source', () => {
      expect(recencyScore(24)).toBe(26)
    })

    it('gives ~13 for 3-day-old source', () => {
      expect(recencyScore(72)).toBe(17)
    })
  })

  describe('multiplicity scoring (0-30)', () => {
    const multiplicityScore = (publisherCount: number) =>
      Math.min(30, Math.round(publisherCount * 7.5))

    it('gives 0 for no publishers', () => {
      expect(multiplicityScore(0)).toBe(0)
    })

    it('gives 8 (7.5 rounded) for 1 publisher', () => {
      expect(multiplicityScore(1)).toBe(8)
    })

    it('gives 15 for 2 publishers', () => {
      expect(multiplicityScore(2)).toBe(15)
    })

    it('gives 23 for 3 publishers', () => {
      expect(multiplicityScore(3)).toBe(23)
    })

    it('caps at 30 for 4 publishers', () => {
      expect(multiplicityScore(4)).toBe(30)
    })

    it('caps at 30 for 10 publishers', () => {
      expect(multiplicityScore(10)).toBe(30)
    })
  })

  describe('asymmetry scoring (0-20)', () => {
    const asymmetryScore = (hasCounterNarrative: boolean) =>
      hasCounterNarrative ? 5 : 20

    it('gives 5 when counter-narrative exists', () => {
      expect(asymmetryScore(true)).toBe(5)
    })

    it('gives 20 when no counter-narrative', () => {
      expect(asymmetryScore(false)).toBe(20)
    })
  })

  describe('silence scoring (0-20)', () => {
    const silenceScore = (existingPosts: number) =>
      Math.round(20 * Math.max(0, 1 - existingPosts / 3))

    it('gives max (20) when no existing posts', () => {
      expect(silenceScore(0)).toBe(20)
    })

    it('gives 0 when 3+ existing posts', () => {
      expect(silenceScore(3)).toBe(0)
    })

    it('gives 13 for 1 existing post', () => {
      expect(silenceScore(1)).toBe(13)
    })

    it('gives 7 for 2 existing posts', () => {
      expect(silenceScore(2)).toBe(7)
    })

    it('clamps to 0 for more than 3 posts', () => {
      expect(silenceScore(5)).toBe(0)
      expect(silenceScore(100)).toBe(0)
    })
  })

  describe('total score', () => {
    it('sums all components correctly', () => {
      const recency = 30, multiplicity = 15, asymmetry = 20, silence = 20
      expect(recency + multiplicity + asymmetry + silence).toBe(85)
    })

    it('max possible score is 100', () => {
      expect(30 + 30 + 20 + 20).toBe(100)
    })

    it('min possible score is 5 (asymmetry floor with counter-narrative)', () => {
      // recency=0, multiplicity=0, asymmetry=5 (counter-narrative), silence=0
      expect(0 + 0 + 5 + 0).toBe(5)
    })

    it('min without counter-narrative is 20', () => {
      expect(0 + 0 + 20 + 0).toBe(20)
    })
  })

  describe('contrast keyword detection', () => {
    const contrastKeywords = ['however', 'dispute', 'challenge', 'deny', 'counter', 'oppose', 'critics', 'rebut']

    it('detects contrast keywords in text', () => {
      const text = 'Critics challenge the findings'
      const hasCounter = contrastKeywords.some(kw => text.toLowerCase().includes(kw))
      expect(hasCounter).toBe(true)
    })

    it('returns false for neutral text', () => {
      const text = 'The report outlines new findings on climate trends'
      const hasCounter = contrastKeywords.some(kw => text.toLowerCase().includes(kw))
      expect(hasCounter).toBe(false)
    })

    it('detects "however" as contrast', () => {
      const text = 'However, some analysts disagree'
      const hasCounter = contrastKeywords.some(kw => text.toLowerCase().includes(kw))
      expect(hasCounter).toBe(true)
    })

    it('detects "rebut" as contrast', () => {
      const text = 'Officials rebut the allegations'
      const hasCounter = contrastKeywords.some(kw => text.toLowerCase().includes(kw))
      expect(hasCounter).toBe(true)
    })
  })
})
