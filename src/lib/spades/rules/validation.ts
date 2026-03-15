/**
 * Card play validation logic.
 */

import type { Card, Suit, GameMode } from '../shared';
import { isTrump } from './comparison';

function cardMatchesSuit(card: Card, suit: Suit, mode: GameMode): boolean {
  if (card.suit === suit) return true;

  if (mode === 'threeJokers' && suit === 'spades') {
    if (card.rank === 'BigJoker' || card.rank === 'LittleJoker') {
      return true;
    }
  }

  return false;
}

export function hasSuit(hand: Card[], suit: Suit): boolean {
  return hand.some(card => card.suit === suit);
}

export function hasNonTrump(hand: Card[], mode: GameMode): boolean {
  return hand.some(card => !isTrump(card, mode));
}

export function getPlayableCards(
  hand: Card[],
  leadSuit: Suit | null,
  isLeading: boolean,
  spadesBroken: boolean,
  mode: GameMode
): Card[] {
  if (hand.length === 0) {
    return [];
  }

  if (isLeading) {
    return getLeadingOptions(hand, spadesBroken, mode);
  }

  if (leadSuit === null) {
    return hand;
  }

  const followingCards = hand.filter(card => cardMatchesSuit(card, leadSuit, mode));
  if (followingCards.length > 0) {
    return followingCards;
  }

  return hand;
}

function getLeadingOptions(
  hand: Card[],
  spadesBroken: boolean,
  mode: GameMode
): Card[] {
  if (mode === 'straightStruggle') {
    return hand;
  }

  if (spadesBroken) {
    return hand;
  }

  const nonTrump = hand.filter(card => !isTrump(card, mode));
  if (nonTrump.length > 0) {
    return nonTrump;
  }

  return hand;
}

export function validatePlay(
  card: Card,
  hand: Card[],
  leadSuit: Suit | null,
  isLeading: boolean,
  spadesBroken: boolean,
  mode: GameMode
): string | null {
  const inHand = hand.some(c => c.suit === card.suit && c.rank === card.rank);
  if (!inHand) {
    return 'Card not in hand';
  }

  const playable = getPlayableCards(hand, leadSuit, isLeading, spadesBroken, mode);
  const canPlay = playable.some(c => c.suit === card.suit && c.rank === card.rank);

  if (!canPlay) {
    if (isLeading && !spadesBroken && isTrump(card, mode)) {
      return 'Cannot lead spades until broken';
    }
    if (!isLeading && leadSuit !== null) {
      return `Must follow suit (${leadSuit})`;
    }
    return 'Illegal play';
  }

  return null;
}

export function wouldBreakSpades(card: Card, mode: GameMode): boolean {
  if (mode === 'straightStruggle') {
    return false;
  }
  return isTrump(card, mode);
}
