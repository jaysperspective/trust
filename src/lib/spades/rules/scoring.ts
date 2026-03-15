/**
 * Scoring logic for Spades House Rules.
 */

import type { GameMode, Team, HandEndResult, TeamHandState, TeamGameState } from '../shared';

export interface ScoringInput {
  team: Team;
  bid: number;
  booksWon: number;
  currentScore: number;
  currentSetsCount: number;
  handIndex: number;
  mode: GameMode;
}

export interface ScoringResult {
  pointsEarned: number;
  isSet: boolean;
  isDime: boolean;
  newScore: number;
  newSetsCount: number;
  isInstantWin: boolean;
  isInstantLoss: boolean;
  winReason: 'firstHandDime' | 'threeSetLoss' | null;
}

export function dimeEnabled(mode: GameMode): boolean {
  return mode !== 'straightStruggle';
}

export function setLimitEnabled(mode: GameMode): boolean {
  return mode !== 'straightStruggle';
}

export function calculateHandScore(input: ScoringInput): ScoringResult {
  const { bid, booksWon, currentScore, currentSetsCount, handIndex, mode } = input;

  let pointsEarned = 0;
  let isSet = false;
  let isDime = false;
  let isInstantWin = false;
  let isInstantLoss = false;
  let winReason: 'firstHandDime' | 'threeSetLoss' | null = null;

  const over = booksWon - bid;

  if (booksWon < bid) {
    isSet = true;
    pointsEarned = -(bid * 10);
  } else if (over >= 4) {
    isSet = true;
    pointsEarned = -(bid * 10);
  } else if (over === 3) {
    pointsEarned = 0;
  } else {
    if (booksWon === 10 && dimeEnabled(mode)) {
      isDime = true;
      pointsEarned = 110;

      if (handIndex === 0) {
        isInstantWin = true;
        winReason = 'firstHandDime';
      }
    } else {
      pointsEarned = booksWon * 10;
    }
  }

  const newScore = currentScore + pointsEarned;
  let newSetsCount = currentSetsCount;

  if (isSet) {
    newSetsCount = currentSetsCount + 1;

    if (setLimitEnabled(mode) && newSetsCount >= 3) {
      isInstantLoss = true;
      winReason = 'threeSetLoss';
    }
  }

  return {
    pointsEarned,
    isSet,
    isDime,
    newScore,
    newSetsCount,
    isInstantWin,
    isInstantLoss,
    winReason,
  };
}

export function calculateHandResults(
  teamStates: Record<Team, TeamHandState>,
  teamGameStates: Record<Team, TeamGameState>,
  handIndex: number,
  mode: GameMode
): { results: HandEndResult[]; winner: Team | null; winReason: 'firstHandDime' | 'threeSetLoss' | null } {
  const teams: Team[] = ['NS', 'EW'];
  const results: HandEndResult[] = [];
  let winner: Team | null = null;
  let winReason: 'firstHandDime' | 'threeSetLoss' | null = null;

  for (const team of teams) {
    const handState = teamStates[team];
    const gameState = teamGameStates[team];

    const scoringResult = calculateHandScore({
      team,
      bid: handState.bid,
      booksWon: handState.booksWon,
      currentScore: gameState.score,
      currentSetsCount: gameState.setsCount,
      handIndex,
      mode,
    });

    results.push({
      team,
      bid: handState.bid,
      booksWon: handState.booksWon,
      overbooks: Math.max(0, handState.booksWon - handState.bid),
      isSet: scoringResult.isSet,
      isDime: scoringResult.isDime,
      pointsEarned: scoringResult.pointsEarned,
      newScore: scoringResult.newScore,
      setsCount: scoringResult.newSetsCount,
    });

    if (scoringResult.isInstantWin) {
      winner = team;
      winReason = scoringResult.winReason;
    }

    if (scoringResult.isInstantLoss) {
      winner = team === 'NS' ? 'EW' : 'NS';
      winReason = scoringResult.winReason;
    }
  }

  return { results, winner, winReason };
}

export function hasReachedTargetScore(score: number, targetScore: number): boolean {
  return score >= targetScore;
}

export function determineGameWinner(
  results: HandEndResult[],
  targetScore: number
): Team | null {
  for (const result of results) {
    if (result.newScore >= targetScore) {
      return result.team;
    }
  }
  return null;
}

export function validateTeamBid(teamBid: number): string | null {
  if (teamBid < 4) {
    return 'Team bid must be at least 4 (Board)';
  }
  return null;
}

export function calculateTeamBid(bid1: number, bid2: number): number {
  return bid1 + bid2;
}
