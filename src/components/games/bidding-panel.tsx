'use client';

import { useState } from 'react';
import type { Seat } from '@/lib/spades/shared';
import { useCPUGameRoomState } from '@/lib/spades/store/cpu-game-store';

interface BiddingPanelProps {
  isMyTurn: boolean;
  onSubmitBid: (bid: number) => void;
}

export function BiddingPanel({ isMyTurn, onSubmitBid }: BiddingPanelProps) {
  const [bidValue, setBidValue] = useState(0);
  const roomState = useCPUGameRoomState();

  const hand = roomState?.hand;
  if (!hand || roomState?.phase !== 'BIDDING') return null;

  const bids = hand.bids;
  const partnerBid = bids['N'];
  const myBid = bids['S'];
  const minBidForBoard = Math.max(0, 4 - (partnerBid ?? 0));

  const bidOrder: Seat[] = ['E', 'S', 'W', 'N'];
  const bidLabels: Record<Seat, string> = {
    N: 'North',
    E: 'East',
    W: 'West',
    S: 'You',
  };

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl p-3 border border-[var(--border-default)]">
      {/* Bid summary */}
      <div className="flex items-center justify-center gap-4 mb-3 pb-2 border-b border-[var(--border-subtle)]">
        {bidOrder.map((seat) => {
          const bid = bids[seat];
          const isCurrentTurn = hand.currentTurn === seat;
          const isMySeat = seat === 'S';
          const isNS = seat === 'N' || seat === 'S';

          return (
            <div
              key={seat}
              className={`text-center px-3 py-1 rounded-lg ${isCurrentTurn ? 'bg-[rgba(142,41,55,0.08)] ring-1 ring-[var(--accent-primary)]' : ''}`}
            >
              <div className={`text-xs ${isMySeat ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-muted)]'}`}>
                {bidLabels[seat]}
              </div>
              {bid !== undefined ? (
                <div className={`text-xl font-bold ${isNS ? 'text-[var(--status-success)]' : 'text-[var(--accent-secondary)]'}`}>
                  {bid}
                </div>
              ) : isCurrentTurn ? (
                <div className="text-lg text-[var(--accent-primary)] animate-pulse">...</div>
              ) : (
                <div className="text-lg text-[var(--border-medium)]">-</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Team totals */}
      {bids['N'] !== undefined && bids['S'] !== undefined && (
        <div className="flex justify-center gap-6 mb-3 text-sm">
          <div className="text-[var(--status-success)]">
            NS Total: <span className="font-bold">{(bids['N'] ?? 0) + (bids['S'] ?? 0)}</span>
          </div>
          {bids['E'] !== undefined && bids['W'] !== undefined && (
            <div className="text-[var(--accent-secondary)]">
              EW Total: <span className="font-bold">{(bids['E'] ?? 0) + (bids['W'] ?? 0)}</span>
            </div>
          )}
        </div>
      )}

      {/* Human bidding controls */}
      {myBid === undefined && isMyTurn && (
        <>
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-[var(--accent-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
              Your Turn to Bid
            </div>
            {partnerBid !== undefined && partnerBid < 4 && (
              <div className="text-sm text-[var(--status-warning)]">
                Partner bid {partnerBid} (Need {minBidForBoard}+ for Board)
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBidValue(Math.max(0, bidValue - 1))}
                className="btn btn-secondary w-10 h-10 text-xl font-bold rounded-full p-0"
                disabled={bidValue <= 0}
              >
                -
              </button>
              <div className="text-3xl font-bold w-12 text-center text-[var(--text-primary)]">{bidValue}</div>
              <button
                onClick={() => setBidValue(Math.min(13, bidValue + 1))}
                className="btn btn-secondary w-10 h-10 text-xl font-bold rounded-full p-0"
                disabled={bidValue >= 13}
              >
                +
              </button>
            </div>

            <div className="flex gap-1 flex-wrap flex-1">
              {Array.from({ length: 14 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setBidValue(i)}
                  className={`w-8 h-8 text-xs font-bold rounded ${
                    bidValue === i
                      ? 'bg-[var(--accent-primary)] text-[var(--text-on-dark)]'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--border-default)]'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>

            <button
              onClick={() => onSubmitBid(bidValue)}
              className="btn btn-primary px-4 py-2 font-bold whitespace-nowrap"
            >
              Bid {bidValue}
            </button>
          </div>

          {partnerBid !== undefined && bidValue + partnerBid < 4 && (
            <div className="text-[var(--status-warning)] text-xs mt-2 text-center">
              Warning: Team bid {bidValue + partnerBid} is below Board minimum of 4
            </div>
          )}
        </>
      )}

      {myBid !== undefined && hand.currentTurn !== 'S' && (
        <div className="text-center text-[var(--text-muted)]">
          Waiting for remaining bids...
        </div>
      )}
    </div>
  );
}
