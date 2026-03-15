/**
 * Game state machine reducer.
 * Pure functions that transform game state based on actions.
 */

import type {
  RoomState,
  HandState,
  Seat,
  Team,
  Card,
  GameMode,
  TargetScore,
  Player,
  SeatState,
  PlayedCard,
  Book,
  TeamHandState,
  TeamGameState,
} from '../shared';
import { SEATS, getTeam, getNextSeat, getPartner, deepClone } from '../shared';
import {
  createDeck,
  shuffleDeck,
  dealCards,
  sortHand,
  hasNoSpades,
  determineBookWinner,
  validatePlay,
  wouldBreakSpades,
  calculateHandResults,
  validateTeamBid,
  getModeConfig,
  isTrump,
} from '../rules';
import type { GameAction, ActionResult, SideEffect } from './actions';

export function createInitialRoomState(
  code: string,
  mode: GameMode,
  targetScore: TargetScore,
  hostPlayerId: string
): RoomState {
  const seats: Record<Seat, SeatState> = {
    N: { seat: 'N', playerId: null, player: null },
    E: { seat: 'E', playerId: null, player: null },
    S: { seat: 'S', playerId: null, player: null },
    W: { seat: 'W', playerId: null, player: null },
  };

  return {
    code,
    mode,
    targetScore,
    hostPlayerId,
    seats,
    teamGameStates: {
      NS: { score: 0, setsCount: 0 },
      EW: { score: 0, setsCount: 0 },
    },
    hand: null,
    phase: 'LOBBY',
    gameRedealUsed: false,
    winner: null,
    winReason: null,
  };
}

function createInitialHandState(dealerSeat: Seat, handIndex: number): HandState {
  return {
    handIndex,
    phase: 'DEAL',
    dealerSeat,
    currentTurn: null,
    hands: { N: [], E: [], S: [], W: [] },
    bids: {},
    currentBook: [],
    leadSuit: null,
    completedBooks: [],
    teamStates: {
      NS: { bid: 0, booksWon: 0 },
      EW: { bid: 0, booksWon: 0 },
    },
    spadesBroken: false,
    redealUsed: false,
    redealOfferedTo: null,
  };
}

export function getPlayerSeat(state: RoomState, playerId: string): Seat | null {
  for (const seat of SEATS) {
    if (state.seats[seat].playerId === playerId) {
      return seat;
    }
  }
  return null;
}

export function getPlayer(state: RoomState, playerId: string): Player | null {
  for (const seat of SEATS) {
    if (state.seats[seat].player?.id === playerId) {
      return state.seats[seat].player;
    }
  }
  return null;
}

function allPlayersReady(state: RoomState): boolean {
  for (const seat of SEATS) {
    const seatState = state.seats[seat];
    if (!seatState.player || !seatState.player.ready) {
      return false;
    }
  }
  return true;
}

export function gameReducer(
  state: RoomState,
  action: GameAction
): { state: RoomState; result: ActionResult } {
  const newState = deepClone(state);
  const sideEffects: SideEffect[] = [];

  let error: string | undefined;

  switch (action.type) {
    case 'ADD_PLAYER': {
      const existing = getPlayer(newState, action.playerId);
      if (existing) {
        error = 'Player already in room';
        break;
      }
      break;
    }

    case 'REMOVE_PLAYER': {
      const seat = getPlayerSeat(newState, action.playerId);
      if (seat) {
        newState.seats[seat].playerId = null;
        newState.seats[seat].player = null;
      }
      sideEffects.push({ type: 'BROADCAST_STATE' });
      break;
    }

    case 'PLAYER_DISCONNECT': {
      const seat = getPlayerSeat(newState, action.playerId);
      if (seat && newState.seats[seat].player) {
        newState.seats[seat].player!.connected = false;
        newState.seats[seat].player!.socketId = null;
      }
      sideEffects.push({ type: 'BROADCAST_STATE' });
      break;
    }

    case 'PLAYER_RECONNECT': {
      const seat = getPlayerSeat(newState, action.playerId);
      if (seat && newState.seats[seat].player) {
        newState.seats[seat].player!.connected = true;
        newState.seats[seat].player!.socketId = action.socketId;
      }
      sideEffects.push({ type: 'BROADCAST_STATE' });
      if (newState.hand && newState.phase !== 'LOBBY') {
        sideEffects.push({ type: 'SEND_PRIVATE_HANDS' });
      }
      break;
    }

    case 'TAKE_SEAT': {
      if (newState.phase !== 'LOBBY') {
        error = 'Cannot change seats during game';
        break;
      }

      if (newState.seats[action.seat].playerId !== null) {
        error = 'Seat is already taken';
        break;
      }

      const currentSeat = getPlayerSeat(newState, action.playerId);
      if (currentSeat) {
        newState.seats[currentSeat].playerId = null;
        newState.seats[currentSeat].player = null;
      }

      newState.seats[action.seat].playerId = action.playerId;
      sideEffects.push({ type: 'BROADCAST_STATE' });
      break;
    }

    case 'LEAVE_SEAT': {
      if (newState.phase !== 'LOBBY') {
        error = 'Cannot leave seat during game';
        break;
      }

      const seat = getPlayerSeat(newState, action.playerId);
      if (!seat) {
        error = 'Player is not seated';
        break;
      }

      newState.seats[seat].playerId = null;
      newState.seats[seat].player = null;
      sideEffects.push({ type: 'BROADCAST_STATE' });
      break;
    }

    case 'ADD_CPU_TO_SEAT': {
      if (newState.phase !== 'LOBBY') {
        error = 'Cannot add CPU during game';
        break;
      }

      if (action.hostPlayerId !== newState.hostPlayerId) {
        error = 'Only the host can add CPU players';
        break;
      }

      if (newState.seats[action.seat].playerId !== null) {
        error = 'Seat is already taken';
        break;
      }

      const cpuNames: Record<Seat, string> = {
        N: 'CPU North',
        E: 'CPU East',
        S: 'CPU South',
        W: 'CPU West',
      };
      const cpuId = `cpu-${action.seat}-${Date.now()}`;

      newState.seats[action.seat].playerId = cpuId;
      newState.seats[action.seat].player = {
        id: cpuId,
        name: cpuNames[action.seat],
        socketId: null,
        reconnectToken: '',
        ready: true,
        connected: true,
        isCPU: true,
      };

      sideEffects.push({ type: 'BROADCAST_STATE' });
      break;
    }

    case 'REMOVE_CPU_FROM_SEAT': {
      if (newState.phase !== 'LOBBY') {
        error = 'Cannot remove CPU during game';
        break;
      }

      if (action.hostPlayerId !== newState.hostPlayerId) {
        error = 'Only the host can remove CPU players';
        break;
      }

      const seatState = newState.seats[action.seat];
      if (!seatState.player?.isCPU) {
        error = 'No CPU in this seat';
        break;
      }

      newState.seats[action.seat].playerId = null;
      newState.seats[action.seat].player = null;
      sideEffects.push({ type: 'BROADCAST_STATE' });
      break;
    }

    case 'SET_READY': {
      if (newState.phase !== 'LOBBY') {
        error = 'Cannot change ready status during game';
        break;
      }

      const seat = getPlayerSeat(newState, action.playerId);
      if (!seat) {
        error = 'Player is not seated';
        break;
      }

      if (!newState.seats[seat].player) {
        error = 'Player not found in seat';
        break;
      }

      newState.seats[seat].player!.ready = action.ready;

      if (action.ready && allPlayersReady(newState)) {
        const startResult = gameReducer(newState, { type: 'START_GAME' });
        return startResult;
      }

      sideEffects.push({ type: 'BROADCAST_STATE' });
      break;
    }

    case 'START_GAME': {
      if (newState.phase !== 'LOBBY') {
        error = 'Game already started';
        break;
      }

      if (!allPlayersReady(newState)) {
        error = 'Not all players are ready';
        break;
      }

      newState.hand = createInitialHandState('N', 0);
      newState.phase = 'DEAL';

      const dealResult = gameReducer(newState, { type: 'DEAL_CARDS' });
      return dealResult;
    }

    case 'DEAL_CARDS': {
      if (!newState.hand) {
        error = 'No active hand';
        break;
      }

      const deck = createDeck(newState.mode);
      const shuffled = shuffleDeck(deck, action.seed);
      const [n, e, s, w] = dealCards(shuffled);

      newState.hand.hands = {
        N: sortHand(n, newState.mode),
        E: sortHand(e, newState.mode),
        S: sortHand(s, newState.mode),
        W: sortHand(w, newState.mode),
      };

      const modeConfig = getModeConfig(newState.mode);
      if (modeConfig.redealAllowed && !newState.gameRedealUsed) {
        for (const seat of SEATS) {
          if (hasNoSpades(newState.hand.hands[seat])) {
            newState.hand.phase = 'REDEAL_OFFER';
            newState.hand.redealOfferedTo = seat;
            newState.phase = 'REDEAL_OFFER';
            sideEffects.push({ type: 'BROADCAST_STATE' });
            sideEffects.push({ type: 'SEND_PRIVATE_HANDS' });
            return { state: newState, result: { success: true, sideEffects } };
          }
        }
      }

      newState.hand.phase = 'BIDDING';
      newState.phase = 'BIDDING';
      newState.hand.currentTurn = getNextSeat(newState.hand.dealerSeat);

      sideEffects.push({ type: 'BROADCAST_STATE' });
      sideEffects.push({ type: 'SEND_PRIVATE_HANDS' });
      break;
    }

    case 'REQUEST_REDEAL': {
      if (!newState.hand || newState.phase !== 'REDEAL_OFFER') {
        error = 'Not in redeal offer phase';
        break;
      }

      const seat = getPlayerSeat(newState, action.playerId);
      if (!seat) {
        error = 'Player not seated';
        break;
      }

      if (seat !== newState.hand.redealOfferedTo) {
        error = 'Redeal not offered to you';
        break;
      }

      if (action.accept) {
        newState.gameRedealUsed = true;
        newState.hand.redealUsed = true;

        const dealResult = gameReducer(newState, { type: 'DEAL_CARDS' });
        return dealResult;
      } else {
        newState.hand.redealOfferedTo = null;

        const modeConfig = getModeConfig(newState.mode);
        if (modeConfig.redealAllowed && !newState.gameRedealUsed) {
          const currentSeatIdx = SEATS.indexOf(seat);
          for (let i = 1; i < 4; i++) {
            const checkSeat = SEATS[(currentSeatIdx + i) % 4]!;
            if (hasNoSpades(newState.hand.hands[checkSeat])) {
              newState.hand.redealOfferedTo = checkSeat;
              sideEffects.push({ type: 'BROADCAST_STATE' });
              return { state: newState, result: { success: true, sideEffects } };
            }
          }
        }

        newState.hand.phase = 'BIDDING';
        newState.phase = 'BIDDING';
        newState.hand.currentTurn = getNextSeat(newState.hand.dealerSeat);
      }

      sideEffects.push({ type: 'BROADCAST_STATE' });
      break;
    }

    case 'SUBMIT_BID': {
      if (!newState.hand || newState.phase !== 'BIDDING') {
        error = 'Not in bidding phase';
        break;
      }

      const seat = getPlayerSeat(newState, action.playerId);
      if (!seat) {
        error = 'Player not seated';
        break;
      }

      if (seat !== newState.hand.currentTurn) {
        error = 'Not your turn to bid';
        break;
      }

      if (action.bid < 0 || action.bid > 13) {
        error = 'Bid must be between 0 and 13';
        break;
      }

      newState.hand.bids[seat] = action.bid;

      const allBids = Object.keys(newState.hand.bids).length === 4;

      if (allBids) {
        const nsBid = (newState.hand.bids.N ?? 0) + (newState.hand.bids.S ?? 0);
        const ewBid = (newState.hand.bids.E ?? 0) + (newState.hand.bids.W ?? 0);

        const nsError = validateTeamBid(nsBid);
        const ewError = validateTeamBid(ewBid);

        if (nsError || ewError) {
          newState.hand.bids = {};
          newState.hand.currentTurn = getNextSeat(newState.hand.dealerSeat);
          error = nsError || ewError || 'Invalid team bid';
          sideEffects.push({ type: 'BROADCAST_STATE' });
          break;
        }

        newState.hand.teamStates.NS.bid = nsBid;
        newState.hand.teamStates.EW.bid = ewBid;

        newState.hand.phase = 'PLAYING';
        newState.phase = 'PLAYING';
        newState.hand.currentTurn = getNextSeat(newState.hand.dealerSeat);
      } else {
        newState.hand.currentTurn = getNextSeat(seat);
      }

      sideEffects.push({ type: 'BROADCAST_STATE' });
      break;
    }

    case 'PLAY_CARD': {
      if (!newState.hand || newState.phase !== 'PLAYING') {
        error = 'Not in playing phase';
        break;
      }

      const seat = getPlayerSeat(newState, action.playerId);
      if (!seat) {
        error = 'Player not seated';
        break;
      }

      if (seat !== newState.hand.currentTurn) {
        error = 'Not your turn to play';
        break;
      }

      const hand = newState.hand.hands[seat];
      const isLeading = newState.hand.currentBook.length === 0;
      const leadSuit = isLeading ? null : newState.hand.leadSuit;

      const validationError = validatePlay(
        action.card,
        hand,
        leadSuit,
        isLeading,
        newState.hand.spadesBroken,
        newState.mode
      );

      if (validationError) {
        error = validationError;
        break;
      }

      const cardIndex = hand.findIndex(
        c => c.suit === action.card.suit && c.rank === action.card.rank
      );
      if (cardIndex === -1) {
        error = 'Card not found in hand';
        break;
      }
      hand.splice(cardIndex, 1);

      const playedCard: PlayedCard = { seat, card: action.card };
      newState.hand.currentBook.push(playedCard);

      if (isLeading) {
        newState.hand.leadSuit = action.card.suit;
      }

      if (!newState.hand.spadesBroken && wouldBreakSpades(action.card, newState.mode)) {
        newState.hand.spadesBroken = true;
      }

      if (newState.hand.currentBook.length === 4) {
        const winner = determineBookWinner(newState.hand.currentBook, newState.mode);
        const winnerTeam = getTeam(winner);

        const completedBook: Book = {
          plays: [...newState.hand.currentBook],
          leadSuit: newState.hand.leadSuit,
          winner,
        };
        newState.hand.completedBooks.push(completedBook);

        newState.hand.teamStates[winnerTeam].booksWon++;

        newState.hand.currentBook = [];
        newState.hand.leadSuit = null;

        if (newState.hand.completedBooks.length === 13) {
          const { results, winner: gameWinner, winReason } = calculateHandResults(
            newState.hand.teamStates,
            newState.teamGameStates,
            newState.hand.handIndex,
            newState.mode
          );

          for (const result of results) {
            newState.teamGameStates[result.team].score = result.newScore;
            newState.teamGameStates[result.team].setsCount = result.setsCount;
          }

          newState.hand.phase = 'HAND_END';
          newState.phase = 'HAND_END';
          newState.hand.currentTurn = null;

          sideEffects.push({ type: 'SEND_HAND_END_RESULTS' });

          if (gameWinner) {
            newState.winner = gameWinner;
            newState.winReason = winReason;
            newState.phase = 'GAME_END';
            newState.hand.phase = 'GAME_END';
            sideEffects.push({
              type: 'GAME_OVER',
              winner: gameWinner,
              reason: winReason || 'score',
            });
          } else {
            for (const team of ['NS', 'EW'] as Team[]) {
              if (newState.teamGameStates[team].score >= newState.targetScore) {
                newState.winner = team;
                newState.winReason = 'score';
                newState.phase = 'GAME_END';
                newState.hand.phase = 'GAME_END';
                sideEffects.push({
                  type: 'GAME_OVER',
                  winner: team,
                  reason: 'score',
                });
                break;
              }
            }
          }
        } else {
          newState.hand.currentTurn = winner;
        }
      } else {
        newState.hand.currentTurn = getNextSeat(seat);
      }

      sideEffects.push({ type: 'BROADCAST_STATE' });
      sideEffects.push({ type: 'SEND_PRIVATE_HANDS' });
      break;
    }

    case 'NEXT_HAND': {
      if (!newState.hand || newState.phase !== 'HAND_END') {
        error = 'Not at hand end';
        break;
      }

      const nextDealer = getNextSeat(newState.hand.dealerSeat);
      const nextHandIndex = newState.hand.handIndex + 1;

      newState.hand = createInitialHandState(nextDealer, nextHandIndex);
      newState.phase = 'DEAL';

      const dealResult = gameReducer(newState, { type: 'DEAL_CARDS' });
      return dealResult;
    }

    case 'RESET_GAME': {
      newState.phase = 'LOBBY';
      newState.hand = null;
      newState.winner = null;
      newState.winReason = null;
      newState.gameRedealUsed = false;
      newState.teamGameStates = {
        NS: { score: 0, setsCount: 0 },
        EW: { score: 0, setsCount: 0 },
      };

      for (const seat of SEATS) {
        if (newState.seats[seat].player) {
          newState.seats[seat].player!.ready = false;
        }
      }

      sideEffects.push({ type: 'BROADCAST_STATE' });
      break;
    }

    default: {
      error = `Unknown action type: ${(action as GameAction).type}`;
    }
  }

  if (error) {
    return { state, result: { success: false, error } };
  }

  return { state: newState, result: { success: true, sideEffects } };
}
