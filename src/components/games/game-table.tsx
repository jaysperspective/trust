'use client';

import type { Seat } from '@/lib/spades/shared';
import { useCPUGameRoomState } from '@/lib/spades/store/cpu-game-store';
import { PlayingCard } from './playing-card';

interface GameTableProps {
  thinking: boolean;
  thinkingSeat: Seat | null;
}

export function GameTable({ thinking, thinkingSeat }: GameTableProps) {
  const roomState = useCPUGameRoomState();

  if (!roomState) return null;

  const currentBook = roomState.hand?.currentBook ?? [];

  const getCardPosition = (seat: Seat): string => {
    switch (seat) {
      case 'N': return '-translate-y-6 sm:-translate-y-8';
      case 'S': return 'translate-y-6 sm:translate-y-8';
      case 'E': return 'translate-x-8 sm:translate-x-12';
      case 'W': return '-translate-x-8 sm:-translate-x-12';
    }
  };

  const getSeatLabel = (seat: Seat): string => {
    const labels: Record<Seat, string> = {
      N: 'North',
      E: 'East',
      S: 'You',
      W: 'West',
    };
    return labels[seat];
  };

  return (
    <div className="spades-table relative w-full aspect-[4/3] max-h-[40vh] sm:max-h-[45vh] mx-auto">
      {/* Seat displays */}
      {(['N', 'E', 'S', 'W'] as Seat[]).map((seat) => {
        const seatState = roomState.seats[seat];
        const isCurrentTurn = roomState.hand?.currentTurn === seat;
        const isMySeat = seat === 'S';
        const bid = roomState.hand?.bids[seat];
        const isThinking = thinking && thinkingSeat === seat;
        const isNS = seat === 'N' || seat === 'S';

        const positionClass = {
          N: 'absolute top-0.5 sm:top-2 left-1/2 -translate-x-1/2 z-10',
          S: 'absolute bottom-0.5 sm:bottom-2 left-1/2 -translate-x-1/2 z-10',
          W: 'absolute left-0.5 sm:left-2 top-1/2 -translate-y-1/2 z-10',
          E: 'absolute right-0.5 sm:right-2 top-1/2 -translate-y-1/2 z-10',
        }[seat];

        return (
          <div key={seat} className={positionClass}>
            <div
              className={`
                px-1.5 py-1 sm:px-3 sm:py-2 rounded-lg text-center
                min-w-[50px] sm:min-w-[80px]
                bg-[var(--bg-surface)] border
                ${isCurrentTurn ? 'border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]' : 'border-[var(--border-default)]'}
                ${isMySeat ? 'ring-2 ring-[var(--accent-secondary)]' : ''}
              `}
            >
              <div
                className="font-semibold text-[var(--text-primary)] text-[10px] sm:text-sm truncate max-w-[50px] sm:max-w-[80px]"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {isMySeat ? 'You' : (seatState.playerName || getSeatLabel(seat))}
              </div>

              {bid !== undefined ? (
                <div className="text-[10px] sm:text-xs">
                  <span className={isNS ? 'text-[var(--status-success)]' : 'text-[var(--accent-secondary)]'}>
                    {bid}
                  </span>
                </div>
              ) : isThinking ? (
                <div className="text-[10px] sm:text-xs text-[var(--accent-primary)] animate-pulse">...</div>
              ) : (
                <div className="text-[10px] sm:text-xs text-[var(--text-muted)]">
                  {isNS ? 'NS' : 'EW'}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Center area */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-28 h-20 sm:w-40 sm:h-32">
          {/* Bidding status */}
          {roomState.phase === 'BIDDING' && (
            <div className="absolute inset-0 flex items-center justify-center text-center">
              <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl shadow-sm">
                <div className="text-sm sm:text-lg font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
                  Bidding
                </div>
                {thinking && thinkingSeat ? (
                  <div className="text-xs sm:text-base text-[var(--accent-primary)] animate-pulse font-medium">
                    {getSeatLabel(thinkingSeat)}...
                  </div>
                ) : roomState.hand?.currentTurn === 'S' ? (
                  <div className="text-xs sm:text-base text-[var(--status-success)] font-medium">
                    Your turn
                  </div>
                ) : (
                  <div className="text-[10px] sm:text-xs text-[var(--text-muted)]">
                    Waiting...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Spades broken */}
          {roomState.hand?.spadesBroken && roomState.phase === 'PLAYING' && currentBook.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[var(--accent-primary)] text-[10px] sm:text-sm bg-[var(--bg-surface)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">
                Spades Broken
              </span>
            </div>
          )}

          {/* Lead suit */}
          {roomState.phase === 'PLAYING' && currentBook.length > 0 && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 sm:-translate-y-6 text-[9px] sm:text-xs text-[var(--text-muted)]">
              Lead: {roomState.hand?.leadSuit || 'Joker'}
            </div>
          )}

          {/* Played cards */}
          {currentBook.map((play) => (
            <div
              key={`${play.seat}-${play.card.rank}-${play.card.suit}`}
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${getCardPosition(play.seat)} transition-transform`}
            >
              <PlayingCard card={play.card} size="sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Books won */}
      {roomState.phase === 'PLAYING' && roomState.hand && (
        <div className="absolute bottom-0.5 right-0.5 sm:bottom-2 sm:right-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-1 py-0.5 sm:px-2 sm:py-1 rounded text-[9px] sm:text-xs z-20">
          <div className="text-[var(--status-success)]">NS: {roomState.hand.teamStates.NS.booksWon}/{roomState.hand.teamStates.NS.bid}</div>
          <div className="text-[var(--accent-secondary)]">EW: {roomState.hand.teamStates.EW.booksWon}/{roomState.hand.teamStates.EW.bid}</div>
        </div>
      )}
    </div>
  );
}
