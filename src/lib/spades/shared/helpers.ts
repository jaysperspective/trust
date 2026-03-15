/**
 * Shared helper utilities.
 */

import type { Card, Suit } from './types';

// Card display symbols
export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '\u2660',
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
};

export const SUIT_COLORS: Record<Suit, 'red' | 'black'> = {
  spades: 'black',
  hearts: 'red',
  diamonds: 'red',
  clubs: 'black',
};

/**
 * Format a card for display (e.g., "A\u2660", "10\u2665", "BigJoker")
 */
export function formatCard(card: Card): string {
  if (card.rank === 'BigJoker') return '\uD83C\uDCCF Big';
  if (card.rank === 'LittleJoker') return '\uD83C\uDCCF Little';
  if (!card.suit) return card.rank;
  return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
}

/**
 * Format a card with HTML-safe output
 */
export function formatCardPlain(card: Card): string {
  if (card.rank === 'BigJoker') return 'Big Joker';
  if (card.rank === 'LittleJoker') return 'Little Joker';
  if (!card.suit) return card.rank;
  return `${card.rank} of ${card.suit}`;
}

/**
 * Check if two cards are equal
 */
export function cardsEqual(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

/**
 * Generate a unique card key for React lists
 */
export function cardKey(card: Card): string {
  if (!card.suit) return card.rank;
  return `${card.rank}-${card.suit}`;
}

/**
 * Generate a random room code (6 uppercase letters)
 */
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Deep clone an object (simple implementation)
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
