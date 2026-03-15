'use client';

import type { HandEndResult, Team } from '@/lib/spades/shared';

interface HandEndSummaryProps {
  results: HandEndResult[];
  winner: Team | null;
  winReason: string | null;
  onContinue: () => void;
}

export function HandEndSummary({ results, winner, winReason, onContinue }: HandEndSummaryProps) {
  const isGameOver = winner !== null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
      <div className="bg-[var(--bg-surface)] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg sm:mx-4 max-h-[90vh] max-h-[90dvh] overflow-hidden flex flex-col border border-[var(--border-default)]">
        {/* Header */}
        <div className="p-4 text-center border-b border-[var(--border-subtle)]">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
            {isGameOver ? 'Game Over' : 'Hand Complete'}
          </h2>

          {isGameOver && (
            <div className="mt-2">
              <div className="text-2xl sm:text-3xl font-bold text-[var(--accent-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
                {winner === 'NS' ? 'North-South Wins!' : 'East-West Wins!'}
              </div>
              <div className="text-sm text-[var(--text-muted)] mt-1">
                {winReason === 'score' && 'Reached target score'}
                {winReason === 'firstHandDime' && 'First-hand Dime!'}
                {winReason === 'threeSetLoss' && 'Opponent reached 3 Sets'}
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {results.map((result) => (
            <div
              key={result.team}
              className={`p-4 rounded-xl border ${
                result.team === 'NS'
                  ? 'bg-[rgba(75,122,82,0.06)] border-[rgba(75,122,82,0.2)]'
                  : 'bg-[rgba(97,127,174,0.06)] border-[rgba(97,127,174,0.2)]'
              }`}
            >
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-lg text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
                  {result.team === 'NS' ? 'North-South' : 'East-West'}
                </span>
                <span
                  className={`text-2xl font-bold ${
                    result.pointsEarned >= 0 ? 'text-[var(--status-success)]' : 'text-[var(--status-error)]'
                  }`}
                >
                  {result.pointsEarned >= 0 ? '+' : ''}
                  {result.pointsEarned}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Bid:</span>
                  <span className="text-[var(--text-primary)]">{result.bid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Won:</span>
                  <span className="text-[var(--text-primary)]">{result.booksWon}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Over:</span>
                  <span className="text-[var(--text-primary)]">{result.overbooks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Total:</span>
                  <span className="font-bold text-[var(--text-primary)]">{result.newScore}</span>
                </div>
              </div>

              <div className="mt-3 flex gap-2 flex-wrap">
                {result.isSet && (
                  <span className="badge badge-failed text-xs font-bold">SET</span>
                )}
                {result.isDime && (
                  <span className="badge badge-signal text-xs font-bold">DIME!</span>
                )}
                {result.overbooks === 3 && !result.isSet && (
                  <span className="badge badge-default text-xs font-bold">+3 (0 pts)</span>
                )}
                {result.setsCount > 0 && (
                  <span className="badge badge-failed text-xs">Sets: {result.setsCount}/3</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-subtle)]">
          <button
            onClick={onContinue}
            className="btn btn-primary w-full text-lg font-bold"
          >
            {isGameOver ? 'New Game' : 'Next Hand'}
          </button>
        </div>
      </div>
    </div>
  );
}
