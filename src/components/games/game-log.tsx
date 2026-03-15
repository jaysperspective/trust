'use client';

import { useState, useEffect, useRef } from 'react';
import type { Card, Seat } from '@/lib/spades/shared';

interface GameLogProps {
  completedBooks: Array<{
    plays: Array<{ seat: Seat; card: Card }>;
    winner: Seat;
  }>;
  teamStates: {
    NS: { bid: number; booksWon: number };
    EW: { bid: number; booksWon: number };
  };
}

function getBotReaction(event: string): string | null {
  const reactions: Record<string, string[]> = {
    won_book: ['Nice!', 'Got it!', 'Easy money', "That's mine!"],
    lost_book: ['Dang...', 'Next time', 'Ugh', 'Lucky...'],
    cut_book: ['CUT!', 'Ruff!', 'Trump card!'],
    got_cut: ['Nooo my ace!', 'Brutal...', 'That hurts'],
    big_play: ['Boom!', 'Take that!', 'Big spade energy'],
  };

  const options = reactions[event];
  if (!options) return null;
  return options[Math.floor(Math.random() * options.length)] ?? null;
}

interface ChatMessage {
  id: number;
  seat: Seat;
  text: string;
}

export function GameLog({ completedBooks, teamStates }: GameLogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const lastBookCountRef = useRef(0);
  const messageIdRef = useRef(0);

  const getSeatName = (seat: Seat): string => {
    const names: Record<Seat, string> = { N: 'North', E: 'East', S: 'You', W: 'West' };
    return names[seat];
  };

  const getTeamColor = (seat: Seat): string => {
    return seat === 'N' || seat === 'S' ? 'text-[var(--status-success)]' : 'text-[var(--accent-secondary)]';
  };

  useEffect(() => {
    if (completedBooks.length > lastBookCountRef.current) {
      const newBook = completedBooks[completedBooks.length - 1];
      if (newBook) {
        const winner = newBook.winner;
        const winnerIsBot = winner !== 'S';

        if (winnerIsBot) {
          const reaction = getBotReaction('won_book');
          if (reaction && Math.random() > 0.4) {
            setMessages(prev => [...prev.slice(-10), {
              id: ++messageIdRef.current,
              seat: winner,
              text: reaction,
            }]);
          }
        }

        const leadSuit = newBook.plays[0]?.card.suit;
        const winningPlay = newBook.plays.find(p => p.seat === winner);
        if (winningPlay && winningPlay.card.suit === 'spades' && leadSuit !== 'spades') {
          if (winnerIsBot) {
            const reaction = getBotReaction('cut_book');
            if (reaction && Math.random() > 0.5) {
              setTimeout(() => {
                setMessages(prev => [...prev.slice(-10), {
                  id: ++messageIdRef.current,
                  seat: winner,
                  text: reaction!,
                }]);
              }, 500);
            }
          }
        }
      }
      lastBookCountRef.current = completedBooks.length;
    }
  }, [completedBooks]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)] border-t border-[var(--border-subtle)]">
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-1.5 border-b border-[var(--border-subtle)] flex justify-between items-center">
        <span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-medium">Game Log</span>
        <div className="flex gap-3 text-[10px] sm:text-xs">
          <span className="text-[var(--status-success)]">NS: {teamStates.NS.booksWon}/{teamStates.NS.bid}</span>
          <span className="text-[var(--accent-secondary)]">EW: {teamStates.EW.booksWon}/{teamStates.EW.bid}</span>
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-[var(--text-muted)] text-[10px] sm:text-xs py-2">
            Bot reactions will appear here...
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex items-start gap-1.5">
              <span className={`text-[10px] sm:text-xs font-medium ${getTeamColor(msg.seat)}`}>
                {getSeatName(msg.seat)}:
              </span>
              <span className="text-[10px] sm:text-xs text-[var(--text-secondary)]">{msg.text}</span>
            </div>
          ))
        )}

        <div className="pt-2 mt-2 border-t border-[var(--border-subtle)]">
          <div className="text-[10px] sm:text-xs text-[var(--text-muted)]">
            Books played: {completedBooks.length}/13
          </div>
        </div>
      </div>
    </div>
  );
}
