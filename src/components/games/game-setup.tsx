'use client';

import { useState } from 'react';
import type { GameMode, TargetScore } from '@/lib/spades/shared';
import { getModeConfig } from '@/lib/spades/rules';

interface GameSetupProps {
  playerName: string;
  onStart: (mode: GameMode, targetScore: TargetScore, playerName: string) => void;
}

export function GameSetup({ playerName: defaultPlayerName, onStart }: GameSetupProps) {
  const [mode, setMode] = useState<GameMode>('aceHigh');
  const [targetScore, setTargetScore] = useState<TargetScore>(250);
  const [playerName, setPlayerName] = useState(defaultPlayerName);

  const modes: GameMode[] = ['aceHigh', 'threeJokers', 'straightStruggle'];

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-[var(--bg-surface)] rounded-2xl p-4 sm:p-8 border border-[var(--border-default)]">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
            Play vs CPU
          </h2>
          <p className="text-[var(--text-muted)] text-xs sm:text-sm mt-1">Practice against three bot opponents</p>
        </div>

        {/* Player Name */}
        <div className="mb-3 sm:mb-4">
          <label className="block text-xs sm:text-sm text-[var(--text-muted)] mb-1">Your Name</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            className="input w-full text-sm sm:text-base py-2 sm:py-2.5"
            maxLength={20}
          />
        </div>

        {/* Game Mode */}
        <div className="mb-3 sm:mb-4">
          <label className="block text-xs sm:text-sm text-[var(--text-muted)] mb-1.5">Game Mode</label>
          <div className="flex gap-1.5 sm:gap-2">
            {modes.map((m) => {
              const config = getModeConfig(m);
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 sm:py-2.5 px-1 sm:px-2 rounded-lg text-xs sm:text-sm font-medium transition-all border-2 ${
                    mode === m
                      ? 'border-[var(--accent-primary)] bg-[rgba(142,41,55,0.06)] text-[var(--text-primary)]'
                      : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-medium)]'
                  }`}
                >
                  {config.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mode details */}
        {(() => {
          const config = getModeConfig(mode);
          return (
            <div className="mb-3 sm:mb-4 bg-[var(--bg-elevated)] rounded-xl p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
                  {config.name}
                </h3>
                <span className="text-xs text-[var(--text-muted)]">{config.description}</span>
              </div>

              <ul className="space-y-1 mb-3">
                {config.rules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-[var(--text-secondary)]">
                    <span className="text-[var(--accent-primary)] mt-0.5">&#8226;</span>
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>

              <div className="text-[10px] sm:text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] rounded-lg px-2.5 py-1.5 font-mono overflow-x-auto">
                Spade Power: {config.trumpOrder.join(' > ')}
              </div>
            </div>
          );
        })()}

        {/* Target Score */}
        <div className="mb-4 sm:mb-6">
          <label className="block text-xs sm:text-sm text-[var(--text-muted)] mb-1.5">Target Score</label>
          <div className="flex gap-2 sm:gap-3">
            {([250, 500] as TargetScore[]).map((score) => (
              <button
                key={score}
                onClick={() => setTargetScore(score)}
                className={`flex-1 py-2 sm:py-3 rounded-xl text-center border-2 transition-all ${
                  targetScore === score
                    ? 'border-[var(--accent-primary)] bg-[rgba(142,41,55,0.06)]'
                    : 'border-[var(--border-default)] hover:border-[var(--border-medium)]'
                }`}
              >
                <span className="font-bold text-base sm:text-lg text-[var(--text-primary)]">{score}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onStart(mode, targetScore, playerName || 'You')}
          className="btn btn-primary w-full text-base sm:text-lg py-2.5 sm:py-3"
        >
          Start Game
        </button>
      </div>
    </div>
  );
}
