'use client';

import type { PublicRoomState } from '@/lib/spades/shared';

interface ScoreboardProps {
  roomState: PublicRoomState;
}

export function Scoreboard({ roomState }: ScoreboardProps) {
  const nsScore = roomState.teamGameStates.NS.score;
  const ewScore = roomState.teamGameStates.EW.score;
  const nsSets = roomState.teamGameStates.NS.setsCount;
  const ewSets = roomState.teamGameStates.EW.setsCount;

  const nsBooksWon = roomState.hand?.teamStates.NS.booksWon ?? 0;
  const ewBooksWon = roomState.hand?.teamStates.EW.booksWon ?? 0;
  const nsBid = roomState.hand?.teamStates.NS.bid ?? 0;
  const ewBid = roomState.hand?.teamStates.EW.bid ?? 0;

  const modeDisplay = roomState.mode === 'aceHigh'
    ? 'Ace High'
    : roomState.mode === 'threeJokers'
    ? 'Three Jokers'
    : 'Straight Struggle';

  return (
    <div className="bg-[var(--bg-surface)] rounded-xl p-4 border border-[var(--border-default)]">
      <div className="text-lg font-bold border-b border-[var(--border-subtle)] pb-3 mb-3 flex items-center justify-between">
        <span className="text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>Scoreboard</span>
        <span className="text-sm font-normal text-[var(--text-muted)]">
          To {roomState.targetScore}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-[rgba(75,122,82,0.08)] rounded-xl p-3 text-center border border-[rgba(75,122,82,0.2)]">
          <div className="text-[var(--status-success)] font-medium text-sm mb-1">North/South</div>
          <div className="text-3xl font-bold text-[var(--text-primary)]">{nsScore}</div>
          {nsSets > 0 && (
            <div className="text-xs text-[var(--status-error)] mt-1">Sets: {nsSets}/3</div>
          )}
        </div>
        <div className="bg-[rgba(97,127,174,0.08)] rounded-xl p-3 text-center border border-[rgba(97,127,174,0.2)]">
          <div className="text-[var(--accent-secondary)] font-medium text-sm mb-1">East/West</div>
          <div className="text-3xl font-bold text-[var(--text-primary)]">{ewScore}</div>
          {ewSets > 0 && (
            <div className="text-xs text-[var(--status-error)] mt-1">Sets: {ewSets}/3</div>
          )}
        </div>
      </div>

      {roomState.hand && roomState.phase === 'PLAYING' && (
        <div className="bg-[var(--bg-elevated)] rounded-lg p-3 mb-3">
          <div className="text-xs text-[var(--text-muted)] mb-2 font-medium">This Hand</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between text-[var(--status-success)]">
              <span>NS:</span>
              <span className="font-bold">{nsBooksWon} / {nsBid}</span>
            </div>
            <div className="flex justify-between text-[var(--accent-secondary)]">
              <span>EW:</span>
              <span className="font-bold">{ewBooksWon} / {ewBid}</span>
            </div>
          </div>
        </div>
      )}

      <div className="text-xs text-[var(--text-muted)] text-center">
        Mode: {modeDisplay}
      </div>
    </div>
  );
}
