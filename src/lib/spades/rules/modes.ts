/**
 * Game mode configurations and rule descriptions.
 */

import type { GameMode } from '../shared';

export interface ModeConfig {
  name: string;
  description: string;
  deckType: 'standard' | 'threeJokers';
  spadesLeadRestriction: boolean;
  dimeEnabled: boolean;
  setLimitEnabled: boolean;
  redealAllowed: boolean;
  trumpOrder: string[];
  rules: string[];
}

export const MODE_CONFIGS: Record<GameMode, ModeConfig> = {
  aceHigh: {
    name: 'Ace High',
    description: 'Classic house style with standard rules',
    deckType: 'standard',
    spadesLeadRestriction: true,
    dimeEnabled: true,
    setLimitEnabled: true,
    redealAllowed: true,
    trumpOrder: ['A\u2660', 'K\u2660', 'Q\u2660', 'J\u2660', '10\u2660', '...', '2\u2660'],
    rules: [
      'Standard 52-card deck',
      'Ace is the highest rank',
      'Spades are trump',
      'Spades cannot be led until broken',
      '3 Sets = automatic loss',
      'Dime (exactly 10 books) = 110 points',
      'First-hand Dime = instant win',
      'Redeal allowed if dealt zero spades',
    ],
  },
  threeJokers: {
    name: 'Three Jokers',
    description: 'Modified deck with jokers and special trump order',
    deckType: 'threeJokers',
    spadesLeadRestriction: true,
    dimeEnabled: true,
    setLimitEnabled: true,
    redealAllowed: true,
    trumpOrder: ['Big Joker', 'Little Joker', '2\u2660', 'A\u2660', 'K\u2660', '...', '3\u2660'],
    rules: [
      'Modified deck: +2 Jokers, -2\u2666, -2\u2665',
      'Trump order: Big Joker > Little Joker > 2\u2660 > A\u2660 > K\u2660 > ...',
      'Spades cannot be led until broken',
      '3 Sets = automatic loss',
      'Dime (exactly 10 books) = 110 points',
      'First-hand Dime = instant win',
      'Redeal allowed if dealt zero spades',
    ],
  },
  straightStruggle: {
    name: 'Straight Struggle',
    description: 'Simplified rules with no restrictions',
    deckType: 'standard',
    spadesLeadRestriction: false,
    dimeEnabled: false,
    setLimitEnabled: false,
    redealAllowed: false,
    trumpOrder: ['A\u2660', 'K\u2660', 'Q\u2660', 'J\u2660', '10\u2660', '...', '2\u2660'],
    rules: [
      'Standard 52-card deck',
      'Ace is the highest rank',
      'Spades are trump',
      'Spades MAY be led at any time',
      'No Set limit (unlimited Sets allowed)',
      'No Dime bonus',
      'No redeals',
    ],
  },
};

export function getModeConfig(mode: GameMode): ModeConfig {
  return MODE_CONFIGS[mode];
}

export function getModeName(mode: GameMode): string {
  return MODE_CONFIGS[mode].name;
}

export function getModeRulesText(mode: GameMode): string {
  const config = MODE_CONFIGS[mode];
  return [
    `=== ${config.name} ===`,
    config.description,
    '',
    'Rules:',
    ...config.rules.map(r => `\u2022 ${r}`),
    '',
    `Trump order: ${config.trumpOrder.join(' > ')}`,
  ].join('\n');
}
