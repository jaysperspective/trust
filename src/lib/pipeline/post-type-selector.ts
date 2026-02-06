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

  // 3. Historical theme
  if (theme === 'historical_rhyme') {
    return PostTypeV2.historical_echo
  }

  // 4. Low confidence or counter-narrative → open question
  if (confidence === 'LOW' || signalScore.details.hasCounterNarrative) {
    return PostTypeV2.open_question
  }

  // 5. Agent affinity nudge (secondary, not override)
  const sign = moonSign.toLowerCase()
  if (sign === 'cancer' || sign === 'capricorn') {
    // Memory-keeper and strategist lean historical
    if (theme === 'power_dynamics' || theme === 'system_misalignment') {
      return PostTypeV2.structural_note
    }
  }
  if (sign === 'pisces' || sign === 'libra') {
    // Mystic and diplomat lean toward questions
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
