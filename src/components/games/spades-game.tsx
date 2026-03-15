'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Card, GameMode, TargetScore } from '@/lib/spades/shared';
import {
  useCPUGameStore,
  useCPUGamePhase,
  useCPUGameRoomState,
  useHumanHand,
  useIsHumanTurn,
  useCPUThinking,
  useFastMode,
} from '@/lib/spades/store/cpu-game-store';
import { CPUGameController, startCPUGame } from '@/lib/spades/controllers/cpu-game-controller';
import { GameSetup } from './game-setup';
import { GameTable } from './game-table';
import { PlayerHand } from './player-hand';
import { BiddingPanel } from './bidding-panel';
import { Scoreboard } from './scoreboard';
import { HandEndSummary } from './hand-end-summary';
import { RulesModal } from './rules-modal';
import { GameLog } from './game-log';
import { PlayingCard } from './playing-card';

export function SpadesGame() {
  const controllerRef = useRef<CPUGameController | null>(null);
  const phase = useCPUGamePhase();
  const roomState = useCPUGameRoomState();
  const humanHand = useHumanHand();
  const isHumanTurn = useIsHumanTurn();
  const { thinking, seat: thinkingSeat } = useCPUThinking();
  const fastMode = useFastMode();
  const handEndResults = useCPUGameStore((s) => s.handEndResults);

  const [showRules, setShowRules] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [showHandEnd, setShowHandEnd] = useState(false);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      useCPUGameStore.getState().reset();
    };
  }, []);

  // Show hand end modal when results arrive
  useEffect(() => {
    if (handEndResults && handEndResults.length > 0) {
      setShowHandEnd(true);
    }
  }, [handEndResults]);

  const handleStartGame = useCallback(async (mode: GameMode, targetScore: TargetScore, playerName: string) => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const controller = await startCPUGame(mode, targetScore, playerName);
    controllerRef.current = controller;
  }, []);

  const handleSubmitBid = useCallback(async (bid: number) => {
    if (controllerRef.current) {
      await controllerRef.current.submitHumanBid(bid);
    }
  }, []);

  const handlePlayCard = useCallback(async (card: Card) => {
    if (controllerRef.current) {
      await controllerRef.current.playHumanCard(card);
    }
  }, []);

  const handleRedeal = useCallback(async (accept: boolean) => {
    if (controllerRef.current) {
      await controllerRef.current.handleRedeal(accept);
    }
  }, []);

  const handleContinue = useCallback(async () => {
    setShowHandEnd(false);

    if (!controllerRef.current) return;

    if (controllerRef.current.isGameComplete()) {
      controllerRef.current.abort();
      controllerRef.current = null;
      useCPUGameStore.getState().reset();
    } else {
      await controllerRef.current.nextHand();
    }
  }, []);

  const handleNewGame = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    useCPUGameStore.getState().reset();
  }, []);

  const toggleFastMode = useCallback(() => {
    const newFast = !fastMode;
    useCPUGameStore.getState().setFastMode(newFast);
    if (controllerRef.current) {
      controllerRef.current.setFastMode(newFast);
    }
  }, [fastMode]);

  // Setup phase
  if (phase === 'setup') {
    return (
      <>
        <h1 className="text-headline text-2xl sm:text-3xl text-center mb-6">Spades House Rules</h1>
        <GameSetup playerName="You" onStart={handleStartGame} />
      </>
    );
  }

  // Loading
  if (!roomState) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" />
      </div>
    );
  }

  const isPlaying = roomState.phase === 'PLAYING';
  const isBidding = roomState.phase === 'BIDDING';
  const isRedealOffer = roomState.phase === 'REDEAL_OFFER' && roomState.hand?.redealOfferedTo === 'S';

  return (
    <div className="flex flex-col gap-3">
      {/* Game controls bar */}
      <div className="flex justify-between items-center bg-[var(--bg-surface)] rounded-xl px-3 py-2 border border-[var(--border-default)]">
        {/* Score display */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
          <span className="text-[var(--status-success)] font-bold">{roomState.teamGameStates.NS.score}</span>
          <span className="text-[var(--text-muted)]">-</span>
          <span className="text-[var(--accent-secondary)] font-bold">{roomState.teamGameStates.EW.score}</span>
          <span className="text-[var(--text-muted)] text-[10px] sm:text-xs">/ {roomState.targetScore}</span>
        </div>

        {/* Speed toggle */}
        <button
          onClick={toggleFastMode}
          className={`text-[10px] sm:text-xs px-2 py-1 rounded-full transition-colors ${
            fastMode
              ? 'bg-[var(--accent-primary)] text-[var(--text-on-dark)]'
              : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
          }`}
        >
          {fastMode ? 'Fast' : 'Normal'}
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setShowScore(true)}
            className="btn btn-ghost text-[10px] sm:text-xs px-2 py-1"
          >
            Score
          </button>
          <button
            onClick={() => setShowRules(true)}
            className="btn btn-ghost text-[10px] sm:text-xs px-2 py-1"
          >
            Rules
          </button>
          <button
            onClick={handleNewGame}
            className="btn btn-ghost text-[10px] sm:text-xs px-2 py-1 text-[var(--status-error)]"
          >
            Quit
          </button>
        </div>
      </div>

      {/* Game table */}
      <GameTable thinking={thinking} thinkingSeat={thinkingSeat} />

      {/* Redeal offer */}
      {isRedealOffer && (
        <div className="bg-[var(--bg-surface)] rounded-xl p-4 border border-[var(--accent-primary)] text-center">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
            Redeal Offer
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-3">
            You were dealt no spades. Would you like a redeal?
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => handleRedeal(true)} className="btn btn-primary px-6">
              Accept Redeal
            </button>
            <button onClick={() => handleRedeal(false)} className="btn btn-secondary px-6">
              Keep Hand
            </button>
          </div>
        </div>
      )}

      {/* Bidding panel */}
      {isBidding && (
        <BiddingPanel isMyTurn={isHumanTurn} onSubmitBid={handleSubmitBid} />
      )}

      {/* Player's hand during bidding (view only) */}
      {isBidding && humanHand && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl overflow-hidden">
          <div className="px-3 py-1 text-[10px] sm:text-xs text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
            Your Hand ({humanHand.length})
          </div>
          <div className="spades-card-fan hide-scrollbar pb-2 sm:pb-3">
            {humanHand.map((card, i) => (
              <PlayingCard
                key={`${card.rank}-${card.suit}-${i}`}
                card={card}
                size="md"
              />
            ))}
          </div>
        </div>
      )}

      {/* Player's hand during play */}
      {humanHand && isPlaying && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl overflow-hidden">
          <div className="px-3 py-1 flex justify-between items-center border-b border-[var(--border-subtle)]">
            <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">Your Hand ({humanHand.length})</span>
            {isHumanTurn && (
              <span className="text-[10px] sm:text-xs text-[var(--accent-primary)] animate-pulse font-medium">
                Tap twice to play
              </span>
            )}
          </div>
          <PlayerHand
            cards={humanHand}
            isMyTurn={isHumanTurn}
            onPlayCard={handlePlayCard}
          />
        </div>
      )}

      {/* Game log */}
      {isPlaying && roomState.hand && (
        <div className="rounded-xl overflow-hidden border border-[var(--border-default)] min-h-[100px]">
          <GameLog
            completedBooks={roomState.hand.completedBooks}
            teamStates={roomState.hand.teamStates}
          />
        </div>
      )}

      {/* Score modal */}
      {showScore && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowScore(false)}>
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <Scoreboard roomState={roomState} />
            <button
              onClick={() => setShowScore(false)}
              className="btn btn-secondary w-full mt-3"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Hand end / Game end summary */}
      {showHandEnd && handEndResults && (
        <HandEndSummary
          results={handEndResults}
          winner={roomState.winner}
          winReason={roomState.winReason}
          onContinue={handleContinue}
        />
      )}

      {/* Rules modal */}
      {showRules && (
        <RulesModal mode={roomState.mode} onClose={() => setShowRules(false)} />
      )}
    </div>
  );
}
