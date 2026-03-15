/**
 * Card comparison and Book winner determination logic.
 */

import type { Card, Suit, Rank, GameMode, PlayedCard, Seat } from '../shared';

const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 11, Q: 12, K: 13, A: 14,
  LittleJoker: 0,
  BigJoker: 0,
};

export function isTrump(card: Card, mode: GameMode): boolean {
  if (card.rank === 'BigJoker' || card.rank === 'LittleJoker') {
    return true;
  }
  return card.suit === 'spades';
}

export function getTrumpValue(card: Card, mode: GameMode): number {
  if (mode === 'threeJokers') {
    if (card.rank === 'BigJoker') return 100;
    if (card.rank === 'LittleJoker') return 99;
    if (card.suit === 'spades' && card.rank === '2') return 98;
    if (card.suit === 'spades') {
      return RANK_VALUES[card.rank];
    }
    return 0;
  }

  if (card.suit === 'spades') {
    return RANK_VALUES[card.rank];
  }
  return 0;
}

export function getSuitValue(card: Card): number {
  return RANK_VALUES[card.rank];
}

export function determineBookWinner(plays: PlayedCard[], mode: GameMode): Seat {
  if (plays.length === 0) {
    throw new Error('Cannot determine winner of empty Book');
  }
  if (plays.length !== 4) {
    throw new Error(`Expected 4 plays, got ${plays.length}`);
  }

  const leadPlay = plays[0]!;
  const leadSuit = getEffectiveSuit(leadPlay.card, mode);

  let winningPlay = leadPlay;
  let winningIsTrump = isTrump(leadPlay.card, mode);
  let winningValue = winningIsTrump
    ? getTrumpValue(leadPlay.card, mode)
    : getSuitValue(leadPlay.card);

  for (let i = 1; i < plays.length; i++) {
    const play = plays[i]!;
    const playIsTrump = isTrump(play.card, mode);
    const playValue = playIsTrump
      ? getTrumpValue(play.card, mode)
      : getSuitValue(play.card);
    const playSuit = getEffectiveSuit(play.card, mode);

    if (playIsTrump && !winningIsTrump) {
      winningPlay = play;
      winningIsTrump = true;
      winningValue = playValue;
      continue;
    }

    if (!playIsTrump && winningIsTrump) {
      continue;
    }

    if (playIsTrump && winningIsTrump) {
      if (playValue > winningValue) {
        winningPlay = play;
        winningValue = playValue;
      }
      continue;
    }

    if (playSuit === leadSuit && playValue > winningValue) {
      winningPlay = play;
      winningValue = playValue;
    }
  }

  return winningPlay.seat;
}

export function getEffectiveSuit(card: Card, _mode: GameMode): Suit | null {
  return card.suit;
}

export function compareCards(
  a: Card,
  b: Card,
  leadSuit: Suit | null,
  mode: GameMode
): number {
  const aIsTrump = isTrump(a, mode);
  const bIsTrump = isTrump(b, mode);

  if (aIsTrump && !bIsTrump) return 1;
  if (!aIsTrump && bIsTrump) return -1;

  if (aIsTrump && bIsTrump) {
    return getTrumpValue(a, mode) - getTrumpValue(b, mode);
  }

  const aSuit = getEffectiveSuit(a, mode);
  const bSuit = getEffectiveSuit(b, mode);

  const aFollows = aSuit === leadSuit;
  const bFollows = bSuit === leadSuit;

  if (aFollows && !bFollows) return 1;
  if (!aFollows && bFollows) return -1;
  if (aFollows && bFollows) {
    return getSuitValue(a) - getSuitValue(b);
  }

  return 0;
}
