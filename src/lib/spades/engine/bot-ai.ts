/**
 * Bot AI module for CPU players (Skill Level 7/10).
 */

import type { Card, Suit, GameMode, Seat, PlayedCard, Book } from '../shared';
import { getTeam, getPartner } from '../shared';
import {
  getPlayableCards,
  isTrump,
  getTrumpValue,
  getSuitValue,
  compareCards,
} from '../rules';

interface SuitAnalysis {
  cards: Card[];
  length: number;
  hasAce: boolean;
  hasKing: boolean;
  hasQueen: boolean;
  highCardCount: number;
  isVoid: boolean;
  isSingleton: boolean;
  isDoubleton: boolean;
}

function analyzeSuit(hand: Card[], suit: Suit): SuitAnalysis {
  const cards = hand.filter(c => c.suit === suit);
  const sorted = [...cards].sort((a, b) => getSuitValue(b) - getSuitValue(a));

  return {
    cards: sorted,
    length: cards.length,
    hasAce: sorted.some(c => getSuitValue(c) === 14),
    hasKing: sorted.some(c => getSuitValue(c) === 13),
    hasQueen: sorted.some(c => getSuitValue(c) === 12),
    highCardCount: sorted.filter(c => getSuitValue(c) >= 12).length,
    isVoid: cards.length === 0,
    isSingleton: cards.length === 1,
    isDoubleton: cards.length === 2,
  };
}

function getPlayedCards(completedBooks: Book[]): Card[] {
  const played: Card[] = [];
  for (const book of completedBooks) {
    for (const play of book.plays) {
      played.push(play.card);
    }
  }
  return played;
}

function countRemainingTrump(
  myTrump: Card[],
  playedCards: Card[],
  currentBook: PlayedCard[],
  mode: GameMode
): number {
  const totalTrump = mode === 'threeJokers' ? 15 : 13;
  const playedTrump = playedCards.filter(c => isTrump(c, mode)).length;
  const currentBookTrump = currentBook.filter(p => isTrump(p.card, mode)).length;
  const myTrumpCount = myTrump.length;
  return totalTrump - playedTrump - currentBookTrump - myTrumpCount;
}

function getHigherCardsRemaining(
  card: Card,
  playedCards: Card[],
  myHand: Card[],
  mode: GameMode
): number {
  const cardValue = isTrump(card, mode) ? getTrumpValue(card, mode) : getSuitValue(card);
  let count = 0;

  if (isTrump(card, mode)) {
    const allTrumpRanks = mode === 'threeJokers'
      ? ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', 'LittleJoker', 'BigJoker']
      : ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    for (const rank of allTrumpRanks) {
      const testCard: Card = rank === 'BigJoker' || rank === 'LittleJoker'
        ? { suit: null as unknown as Suit, rank: rank as Card['rank'] }
        : { suit: 'spades', rank: rank as Card['rank'] };

      const testValue = getTrumpValue(testCard, mode);
      if (testValue > cardValue) {
        const inMyHand = myHand.some(c =>
          (c.rank === testCard.rank && c.suit === testCard.suit) ||
          (c.rank === testCard.rank && (testCard.rank === 'BigJoker' || testCard.rank === 'LittleJoker'))
        );
        const wasPlayed = playedCards.some(c =>
          (c.rank === testCard.rank && c.suit === testCard.suit) ||
          (c.rank === testCard.rank && (testCard.rank === 'BigJoker' || testCard.rank === 'LittleJoker'))
        );
        if (!inMyHand && !wasPlayed) {
          count++;
        }
      }
    }
  } else {
    const allRanks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    for (const rank of allRanks) {
      const testCard: Card = { suit: card.suit, rank: rank as Card['rank'] };
      const testValue = getSuitValue(testCard);
      if (testValue > cardValue) {
        const inMyHand = myHand.some(c => c.suit === card.suit && c.rank === rank);
        const wasPlayed = playedCards.some(c => c.suit === card.suit && c.rank === rank);
        if (!inMyHand && !wasPlayed) {
          count++;
        }
      }
    }
  }

  return count;
}

export function calculateBotBid(
  hand: Card[],
  partnerBid: number | null,
  mode: GameMode
): number {
  let expectedBooks = 0;

  const trumpCards = hand.filter(c => isTrump(c, mode));
  const trumpCount = trumpCards.length;
  const sortedTrump = [...trumpCards].sort((a, b) => getTrumpValue(b, mode) - getTrumpValue(a, mode));

  for (let i = 0; i < sortedTrump.length; i++) {
    const card = sortedTrump[i]!;
    const value = getTrumpValue(card, mode);

    if (mode === 'threeJokers') {
      if (value === 100) expectedBooks += 0.98;
      else if (value === 99) expectedBooks += 0.95;
      else if (value === 98) expectedBooks += 0.92;
      else if (value === 14) expectedBooks += 0.88;
      else if (value === 13) expectedBooks += trumpCount >= 4 ? 0.80 : 0.65;
      else if (value === 12) expectedBooks += trumpCount >= 5 ? 0.70 : 0.45;
      else if (value === 11) expectedBooks += trumpCount >= 5 ? 0.55 : 0.25;
      else if (value >= 9) expectedBooks += trumpCount >= 6 ? 0.40 : 0.15;
      else expectedBooks += trumpCount >= 7 ? 0.30 : 0.05;
    } else {
      if (value === 14) expectedBooks += 0.95;
      else if (value === 13) expectedBooks += trumpCount >= 4 ? 0.85 : 0.70;
      else if (value === 12) expectedBooks += trumpCount >= 4 ? 0.70 : 0.50;
      else if (value === 11) expectedBooks += trumpCount >= 5 ? 0.55 : 0.30;
      else if (value >= 9) expectedBooks += trumpCount >= 5 ? 0.35 : 0.15;
      else expectedBooks += trumpCount >= 6 ? 0.25 : 0.05;
    }
  }

  if (trumpCount > 4) {
    expectedBooks += (trumpCount - 4) * 0.25;
  }

  const sideSuits: Suit[] = ['hearts', 'diamonds', 'clubs'];
  let totalVoids = 0;
  let totalSingletons = 0;
  let totalDoubletons = 0;

  for (const suit of sideSuits) {
    const analysis = analyzeSuit(hand, suit);

    if (analysis.isVoid) { totalVoids++; continue; }
    if (analysis.isSingleton) totalSingletons++;
    else if (analysis.isDoubleton) totalDoubletons++;

    if (analysis.hasAce) {
      if (analysis.length <= 3) expectedBooks += 0.90;
      else if (analysis.length <= 5) expectedBooks += 0.80;
      else expectedBooks += 0.70;

      if (analysis.hasKing) {
        if (analysis.length <= 4) expectedBooks += 0.80;
        else expectedBooks += 0.60;
        if (analysis.hasQueen && analysis.length <= 5) expectedBooks += 0.55;
      }
    } else if (analysis.hasKing) {
      if (analysis.length === 1) expectedBooks += 0.30;
      else if (analysis.length === 2) expectedBooks += 0.45;
      else expectedBooks += 0.55;
      if (analysis.hasQueen && analysis.length >= 3) expectedBooks += 0.35;
    } else if (analysis.hasQueen && analysis.length >= 4) {
      expectedBooks += 0.25;
    }

    if (analysis.length >= 5 && analysis.highCardCount >= 1) {
      expectedBooks += 0.20 * (analysis.length - 4);
    }
  }

  if (trumpCount >= 2) {
    expectedBooks += totalVoids * Math.min(0.85, trumpCount * 0.25);
    expectedBooks += totalSingletons * Math.min(0.65, trumpCount * 0.20);
    expectedBooks += totalDoubletons * Math.min(0.35, trumpCount * 0.12);
  }

  if (totalVoids >= 2 && trumpCount >= 3) {
    expectedBooks += 0.5;
  }

  const variance = (Math.random() - 0.5) * 0.5;
  let bid = Math.round(expectedBooks + variance);
  bid = Math.max(0, Math.min(13, bid));

  if (partnerBid !== null) {
    const teamBid = bid + partnerBid;
    if (teamBid < 4) {
      const needed = 4 - partnerBid;
      if (bid >= needed - 1 && trumpCount >= 2) bid = needed;
      else if (expectedBooks >= needed - 0.5) bid = needed;
    }
    if (partnerBid >= 5 && bid >= 5) {
      if (teamBid > 10 && expectedBooks < bid + 0.5) {
        bid = Math.max(0, bid - 1);
      }
    }
  }

  return Math.max(0, Math.min(13, bid));
}

interface PlayContext {
  hand: Card[];
  currentBook: PlayedCard[];
  completedBooks: Book[];
  bids: Partial<Record<Seat, number>>;
  teamBooksWon: number;
  opponentBooksWon: number;
  spadesBroken: boolean;
  mode: GameMode;
  mySeat: Seat;
}

interface ContractStatus {
  myBid: number;
  partnerBid: number;
  teamBid: number;
  teamBooks: number;
  opponentBooks: number;
  booksNeeded: number;
  booksRemaining: number;
  isAhead: boolean;
  isBehind: boolean;
  isSafe: boolean;
}

function getContractStatus(context: PlayContext): ContractStatus {
  const { bids, teamBooksWon, opponentBooksWon, mySeat, completedBooks } = context;
  const partnerSeat = getPartner(mySeat);
  const myBid = bids[mySeat] ?? 0;
  const partnerBid = bids[partnerSeat] ?? 0;
  const teamBid = myBid + partnerBid;
  const booksPlayed = completedBooks.length;
  const booksRemaining = 13 - booksPlayed;
  const booksNeeded = Math.max(0, teamBid - teamBooksWon);

  return {
    myBid, partnerBid, teamBid,
    teamBooks: teamBooksWon, opponentBooks: opponentBooksWon,
    booksNeeded, booksRemaining,
    isAhead: teamBooksWon >= teamBid,
    isBehind: booksNeeded > booksRemaining,
    isSafe: teamBooksWon >= teamBid - 1 && booksRemaining >= 2,
  };
}

export function chooseBotCard(context: PlayContext): Card {
  const { hand, currentBook, completedBooks, spadesBroken, mode, mySeat } = context;

  const isLeading = currentBook.length === 0;
  const leadSuit = isLeading ? null : currentBook[0]?.card.suit ?? null;

  const playable = getPlayableCards(hand, leadSuit, isLeading, spadesBroken, mode);

  if (playable.length === 0) return hand[0]!;
  if (playable.length === 1) return playable[0]!;

  const playedCards = getPlayedCards(completedBooks);

  if (isLeading) {
    return chooseLeadCard(playable, context, playedCards);
  } else {
    return chooseFollowCard(playable, context, playedCards);
  }
}

function chooseLeadCard(playable: Card[], context: PlayContext, playedCards: Card[]): Card {
  const { mode, completedBooks, hand, currentBook } = context;
  const status = getContractStatus(context);

  const nonTrump = playable.filter(c => !isTrump(c, mode));
  const trump = playable.filter(c => isTrump(c, mode));
  const allTrumpInHand = hand.filter(c => isTrump(c, mode));

  const remainingTrumpOut = countRemainingTrump(allTrumpInHand, playedCards, currentBook, mode);

  if (trump.length >= 4 && remainingTrumpOut > 0) {
    const sortedTrump = [...trump].sort((a, b) => getTrumpValue(b, mode) - getTrumpValue(a, mode));
    const highestTrump = sortedTrump[0]!;
    const higherOut = getHigherCardsRemaining(highestTrump, playedCards, hand, mode);
    if (higherOut === 0) return highestTrump;
    if (higherOut === 1 && trump.length >= 5) return highestTrump;
  }

  if (nonTrump.length > 0) {
    const suitCounts = new Map<Suit, Card[]>();
    for (const card of nonTrump) {
      if (card.suit) {
        const existing = suitCounts.get(card.suit) || [];
        existing.push(card);
        suitCounts.set(card.suit, existing);
      }
    }

    for (const [suit, cards] of suitCounts) {
      const sorted = [...cards].sort((a, b) => getSuitValue(b) - getSuitValue(a));
      const highest = sorted[0];
      if (highest && getSuitValue(highest) === 14) {
        const suitPlayedCount = playedCards.filter(c => c.suit === suit).length;
        const cardsOutInSuit = 13 - suitPlayedCount - cards.length;
        if (completedBooks.length <= 5 || cardsOutInSuit >= 3) return highest;
      }
    }

    for (const [suit, cards] of suitCounts) {
      const sorted = [...cards].sort((a, b) => getSuitValue(b) - getSuitValue(a));
      const highest = sorted[0];
      if (highest && getSuitValue(highest) === 13) {
        const acePlayedOrInHand = playedCards.some(c => c.suit === suit && getSuitValue(c) === 14) ||
          hand.some(c => c.suit === suit && getSuitValue(c) === 14);
        if (acePlayedOrInHand) return highest;
      }
    }

    if (status.isAhead && status.isSafe) {
      let shortestSuit: { suit: Suit; cards: Card[] } | null = null;
      for (const [suit, cards] of suitCounts) {
        if (!shortestSuit || cards.length < shortestSuit.cards.length) {
          shortestSuit = { suit, cards };
        }
      }
      if (shortestSuit && shortestSuit.cards.length <= 2) {
        const sorted = [...shortestSuit.cards].sort((a, b) => getSuitValue(a) - getSuitValue(b));
        return sorted[0]!;
      }
    }

    if (status.booksNeeded > 0 || !status.isAhead) {
      let longestSuit: { suit: Suit; cards: Card[] } | null = null;
      for (const [suit, cards] of suitCounts) {
        if (!longestSuit || cards.length > longestSuit.cards.length) {
          longestSuit = { suit, cards };
        }
      }
      if (longestSuit && longestSuit.cards.length >= 3) {
        const sorted = [...longestSuit.cards].sort((a, b) => getSuitValue(b) - getSuitValue(a));
        if (getSuitValue(sorted[0]!) >= 12) return sorted[0]!;
      }
    }

    let longestSuit: Card[] = [];
    for (const [, cards] of suitCounts) {
      if (cards.length > longestSuit.length) longestSuit = cards;
    }
    if (longestSuit.length > 0) {
      const sorted = [...longestSuit].sort((a, b) => getSuitValue(a) - getSuitValue(b));
      return sorted[0]!;
    }
  }

  if (trump.length > 0) {
    const sortedTrump = [...trump].sort((a, b) => getTrumpValue(b, mode) - getTrumpValue(a, mode));
    const booksPlayed = completedBooks.length;
    if (booksPlayed >= 8 || trump.length >= 4) {
      const higherOut = getHigherCardsRemaining(sortedTrump[0]!, playedCards, hand, mode);
      if (higherOut === 0) return sortedTrump[0]!;
    }
    if (status.booksNeeded > trump.length && status.isBehind) return sortedTrump[0]!;
    return sortedTrump[sortedTrump.length - 1]!;
  }

  return playable[0]!;
}

function chooseFollowCard(playable: Card[], context: PlayContext, playedCards: Card[]): Card {
  const { currentBook, mode, mySeat, hand } = context;
  const status = getContractStatus(context);

  const position = currentBook.length + 1;
  const leadCard = currentBook[0]!.card;
  const leadSuit = leadCard.suit;
  const leadSeat = currentBook[0]!.seat;
  const partnerSeat = getPartner(mySeat);

  const currentWinner = determineCurrentWinner(currentBook, mode);
  const partnerWinning = currentWinner?.seat === partnerSeat;
  const partnerLed = leadSeat === partnerSeat;
  const myTeam = getTeam(mySeat);
  const teamWinning = currentWinner ? getTeam(currentWinner.seat) === myTeam : false;

  const followsSuit = playable.filter(c => c.suit === leadSuit);
  const trumpCards = playable.filter(c => isTrump(c, mode) && c.suit !== leadSuit);
  const offSuit = playable.filter(c => !isTrump(c, mode) && c.suit !== leadSuit);
  const allTrumpInHand = hand.filter(c => isTrump(c, mode));

  if (followsSuit.length > 0) {
    const sorted = [...followsSuit].sort((a, b) => getSuitValue(b) - getSuitValue(a));
    const highest = sorted[0]!;
    const lowest = sorted[sorted.length - 1]!;

    if (partnerWinning) {
      if (getSuitValue(highest) === 14 && currentWinner?.card && getSuitValue(currentWinner.card) === 13) {
        if (status.isAhead || context.completedBooks.length <= 4) return highest;
      }
      return lowest;
    }

    if (position === 2) {
      const higherOut = getHigherCardsRemaining(highest, playedCards, hand, mode);
      if (higherOut === 0) return highest;
      if (status.isAhead) return lowest;
      const winningCards = findWinningCards(sorted, currentBook, mode);
      if (winningCards.length > 0 && status.booksNeeded > 0) return winningCards[winningCards.length - 1]!;
      return lowest;
    }

    if (position === 3) {
      if (partnerLed) {
        const winningCards = findWinningCards(sorted, currentBook, mode);
        if (winningCards.length > 0) return winningCards[winningCards.length - 1]!;
        return lowest;
      } else {
        const winningCards = findWinningCards(sorted, currentBook, mode);
        if (winningCards.length > 0) return winningCards[winningCards.length - 1]!;
        return lowest;
      }
    }

    if (position === 4) {
      if (teamWinning) return lowest;
      const winningCards = findWinningCards(sorted, currentBook, mode);
      if (winningCards.length > 0) return winningCards[winningCards.length - 1]!;
      return lowest;
    }

    const winningCards = findWinningCards(sorted, currentBook, mode);
    if (winningCards.length > 0) return winningCards[winningCards.length - 1]!;
    return lowest;
  }

  if (partnerWinning || teamWinning) {
    if (offSuit.length > 0) {
      const suitGroups = new Map<Suit, Card[]>();
      for (const card of offSuit) {
        if (card.suit) {
          const existing = suitGroups.get(card.suit) || [];
          existing.push(card);
          suitGroups.set(card.suit, existing);
        }
      }
      let bestDiscard: Card | null = null;
      let shortestLength = Infinity;
      for (const [, cards] of suitGroups) {
        if (cards.length < shortestLength) {
          shortestLength = cards.length;
          const sorted = [...cards].sort((a, b) => getSuitValue(a) - getSuitValue(b));
          bestDiscard = sorted[0]!;
        }
      }
      if (bestDiscard) return bestDiscard;
      const sorted = [...offSuit].sort((a, b) => getSuitValue(a) - getSuitValue(b));
      return sorted[0]!;
    }
    if (trumpCards.length > 0) {
      const sorted = [...trumpCards].sort((a, b) => getTrumpValue(a, mode) - getTrumpValue(b, mode));
      return sorted[0]!;
    }
  }

  if (trumpCards.length > 0) {
    const currentWinnerCard = currentWinner?.card;
    const winnerIsTrump = currentWinnerCard ? isTrump(currentWinnerCard, mode) : false;
    const sortedTrump = [...trumpCards].sort((a, b) => getTrumpValue(a, mode) - getTrumpValue(b, mode));

    const shouldCut = evaluateCutDecision(context, status, allTrumpInHand, playedCards);

    if (winnerIsTrump && currentWinnerCard) {
      const canOverTrump = trumpCards.filter(c =>
        getTrumpValue(c, mode) > getTrumpValue(currentWinnerCard, mode)
      );
      if (canOverTrump.length > 0) {
        if (shouldCut || status.booksNeeded > 0 || position === 4) {
          const sorted = [...canOverTrump].sort((a, b) => getTrumpValue(a, mode) - getTrumpValue(b, mode));
          return sorted[0]!;
        }
      }
      if (offSuit.length > 0) {
        const sorted = [...offSuit].sort((a, b) => getSuitValue(a) - getSuitValue(b));
        return sorted[0]!;
      }
      return sortedTrump[0]!;
    } else {
      if (shouldCut) return sortedTrump[0]!;
      if (offSuit.length > 0) {
        const sorted = [...offSuit].sort((a, b) => getSuitValue(a) - getSuitValue(b));
        return sorted[0]!;
      }
      return sortedTrump[0]!;
    }
  }

  if (offSuit.length > 0) {
    const suitGroups = new Map<Suit, Card[]>();
    for (const card of offSuit) {
      if (card.suit) {
        const existing = suitGroups.get(card.suit) || [];
        existing.push(card);
        suitGroups.set(card.suit, existing);
      }
    }
    let bestDiscard: Card | null = null;
    let shortestLength = Infinity;
    for (const [, cards] of suitGroups) {
      if (cards.length < shortestLength) {
        shortestLength = cards.length;
        const sorted = [...cards].sort((a, b) => getSuitValue(a) - getSuitValue(b));
        bestDiscard = sorted[0]!;
      }
    }
    if (bestDiscard) return bestDiscard;
    const sorted = [...offSuit].sort((a, b) => getSuitValue(a) - getSuitValue(b));
    return sorted[0]!;
  }

  const sorted = [...playable].sort((a, b) => getSuitValue(a) - getSuitValue(b));
  return sorted[0]!;
}

function evaluateCutDecision(
  context: PlayContext,
  status: ContractStatus,
  myTrump: Card[],
  playedCards: Card[]
): boolean {
  const { currentBook, mode, completedBooks } = context;

  if (status.isBehind) return true;
  if (status.booksNeeded > 0) return true;

  if (status.isAhead) {
    if (myTrump.length >= 4) return true;
    if (completedBooks.length >= 9) return true;
    const highValueInBook = currentBook.some(p =>
      !isTrump(p.card, mode) && getSuitValue(p.card) >= 13
    );
    if (highValueInBook && myTrump.length >= 2) return true;
    return false;
  }

  return myTrump.length >= 2;
}

function determineCurrentWinner(
  currentBook: PlayedCard[],
  mode: GameMode
): PlayedCard | null {
  if (currentBook.length === 0) return null;

  const leadPlay = currentBook[0]!;
  let winningPlay = leadPlay;

  for (let i = 1; i < currentBook.length; i++) {
    const play = currentBook[i]!;
    if (compareCards(play.card, winningPlay.card, leadPlay.card.suit, mode) > 0) {
      winningPlay = play;
    }
  }

  return winningPlay;
}

function findWinningCards(
  candidates: Card[],
  currentBook: PlayedCard[],
  mode: GameMode
): Card[] {
  const currentWinner = determineCurrentWinner(currentBook, mode);
  if (!currentWinner) return candidates;

  const leadSuit = currentBook[0]?.card.suit ?? null;

  return candidates.filter(c =>
    compareCards(c, currentWinner.card, leadSuit, mode) > 0
  );
}
