'use client';

import { useState, useEffect } from 'react';
import type { Card } from '@/lib/spades/shared';
import { cardsEqual } from '@/lib/spades/shared';
import { PlayingCard } from './playing-card';

interface PlayerHandProps {
  cards: Card[];
  isMyTurn: boolean;
  onPlayCard: (card: Card) => void;
}

export function PlayerHand({ cards, isMyTurn, onPlayCard }: PlayerHandProps) {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  const handleClick = (card: Card) => {
    if (!isMyTurn) return;

    if (selectedCard && cardsEqual(selectedCard, card)) {
      onPlayCard(card);
      setSelectedCard(null);
    } else {
      setSelectedCard(card);
    }
  };

  useEffect(() => {
    if (!isMyTurn) {
      setSelectedCard(null);
    }
  }, [isMyTurn]);

  return (
    <div className="spades-card-fan hide-scrollbar pb-3 pt-1">
      {cards.map((card, i) => (
        <PlayingCard
          key={`${card.rank}-${card.suit}-${i}`}
          card={card}
          size="md"
          clickable={isMyTurn}
          selected={selectedCard !== null && cardsEqual(selectedCard, card)}
          onClick={() => handleClick(card)}
        />
      ))}
    </div>
  );
}
