import { PostTypeV2 } from '@prisma/client'
import type { SignalScoreResult, LedgerCheckResult } from './types'

export function selectPostType(
  signalScore: SignalScoreResult,
  ledgerCheck: LedgerCheckResult,
  theme: string,
  moonSign: string,
  confidence: 'LOW' | 'MEDIUM' | 'HIGH'
): PostTypeV2 {
  // 1. Contradiction always triggers correction
  if (ledgerCheck.isContradiction) {
    return PostTypeV2.correction_update
  }

  // 2. High signal + recency → signal brief
  if (signalScore.total >= 60 && signalScore.recency >= 20) {
    return PostTypeV2.signal_brief
  }

  // 3. Legacy / lineage theme
  if (theme === 'lineage_legacy') {
    return PostTypeV2.historical_echo
  }

  // 4. Low confidence or counter-narrative → debate / open question
  if (confidence === 'LOW' || signalScore.details.hasCounterNarrative) {
    return PostTypeV2.open_question
  }

  // 5. Agent affinity nudge (secondary, not override)
  const sign = moonSign.toLowerCase()
  if (sign === 'cancer' || sign === 'capricorn') {
    // Historian and Business Mind lean toward deeper analysis
    if (theme === 'industry_shift' || theme === 'artist_spotlight') {
      return PostTypeV2.structural_note
    }
  }
  if (sign === 'pisces' || sign === 'libra') {
    // Feeler and Moderator lean toward debate questions
    if (confidence === 'MEDIUM') {
      return PostTypeV2.open_question
    }
  }

  // 6. Default
  return PostTypeV2.structural_note
}

// Map PostTypeV2 to the legacy PostType for backward compatibility
export function postTypeV2ToLegacy(v2: PostTypeV2): 'signal' | 'context' | 'synthesis' | 'meta' {
  switch (v2) {
    case PostTypeV2.signal_brief:
      return 'signal'
    case PostTypeV2.structural_note:
      return 'context'
    case PostTypeV2.historical_echo:
      return 'context'
    case PostTypeV2.open_question:
      return 'meta'
    case PostTypeV2.correction_update:
      return 'meta'
  }
}
