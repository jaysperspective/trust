import { describe, it, expect } from 'vitest'
import { PostTypeV2 } from '@prisma/client'
import { selectPostType } from '../../src/lib/pipeline/post-type-selector'
import type { SignalScoreResult, LedgerCheckResult } from '../../src/lib/pipeline/types'

function makeScore(overrides: Partial<SignalScoreResult> & { details?: Partial<SignalScoreResult['details']> } = {}): SignalScoreResult {
  const { details: detailOverrides, ...rest } = overrides
  return {
    total: 40,
    recency: 10,
    multiplicity: 10,
    asymmetry: 10,
    silence: 10,
    ...rest,
    details: {
      newestSourceAgeHours: 24,
      distinctPublishers: 2,
      totalSources: 4,
      hasCounterNarrative: false,
      existingPostsOnTopic: 0,
      ...detailOverrides,
    },
  }
}

const noLedgerIssues: LedgerCheckResult = {
  isDuplicate: false,
  isContradiction: false,
}

describe('selectPostType', () => {
  it('returns CORRECTION_UPDATE when contradiction found', () => {
    const ledger: LedgerCheckResult = { isDuplicate: false, isContradiction: true }
    expect(selectPostType(makeScore(), ledger, 'any', 'aries', 'HIGH')).toBe(PostTypeV2.correction_update)
  })

  it('returns SIGNAL_BRIEF for high signal + high recency', () => {
    const score = makeScore({ total: 65, recency: 25 })
    expect(selectPostType(score, noLedgerIssues, 'emerging_pattern', 'aries', 'HIGH')).toBe(PostTypeV2.signal_brief)
  })

  it('returns HISTORICAL_ECHO for historical_rhyme theme', () => {
    expect(selectPostType(makeScore(), noLedgerIssues, 'historical_rhyme', 'aries', 'HIGH')).toBe(PostTypeV2.historical_echo)
  })

  it('returns OPEN_QUESTION for low confidence', () => {
    expect(selectPostType(makeScore(), noLedgerIssues, 'power_dynamics', 'aries', 'LOW')).toBe(PostTypeV2.open_question)
  })

  it('returns OPEN_QUESTION when counter-narrative present', () => {
    const score = makeScore({ details: { newestSourceAgeHours: 24, distinctPublishers: 2, totalSources: 4, hasCounterNarrative: true, existingPostsOnTopic: 0 } })
    expect(selectPostType(score, noLedgerIssues, 'power_dynamics', 'aries', 'HIGH')).toBe(PostTypeV2.open_question)
  })

  it('defaults to STRUCTURAL_NOTE', () => {
    expect(selectPostType(makeScore(), noLedgerIssues, 'system_misalignment', 'aries', 'HIGH')).toBe(PostTypeV2.structural_note)
  })

  it('contradiction overrides all other signals', () => {
    const highScore = makeScore({ total: 80, recency: 25 })
    const ledger: LedgerCheckResult = { isDuplicate: false, isContradiction: true }
    expect(selectPostType(highScore, ledger, 'historical_rhyme', 'aries', 'HIGH')).toBe(PostTypeV2.correction_update)
  })
})
