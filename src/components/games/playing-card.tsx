'use client';

import type { Card as CardType } from '@/lib/spades/shared';
import { formatCard, SUIT_COLORS } from '@/lib/spades/shared';

interface PlayingCardProps {
  card: CardType;
  clickable?: boolean;
  selected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function PlayingCard({ card, clickable, selected, onClick, size = 'md' }: PlayingCardProps) {
  const isJoker = card.rank === 'BigJoker' || card.rank === 'LittleJoker';

  const getColorClass = (): string => {
    if (isJoker) return 'playing-card-black';
    if (!card.suit) return 'playing-card-black';
    if (card.suit === 'spades') return 'playing-card-spades';
    const color = SUIT_COLORS[card.suit];
    return color === 'red' ? 'playing-card-red' : 'playing-card-black';
  };

  const sizeClasses = {
    sm: 'playing-card-sm',
    md: 'playing-card-md',
    lg: 'playing-card-lg',
  };

  return (
    <div
      className={`
        playing-card ${sizeClasses[size]}
        ${getColorClass()}
        ${clickable ? 'cursor-pointer active:scale-95 transition-transform' : ''}
        ${selected ? 'ring-2 ring-[var(--accent-primary)] -translate-y-2 shadow-lg' : ''}
      `}
      onClick={clickable ? onClick : undefined}
    >
      {formatCard(card)}
    </div>
  );
}

export function PlayingCardBack({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'playing-card-sm',
    md: 'playing-card-md',
    lg: 'playing-card-lg',
  };
  return <div className={`playing-card ${sizeClasses[size]} playing-card-back`} />;
}
