/**
 * Core types for the Spades House Rules game.
 * Uses "Book" terminology throughout (never "trick").
 */

// Card suits
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

// Card ranks - standard plus jokers for Three Jokers mode
export type Rank =
  | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'J' | 'Q' | 'K' | 'A'
  | 'LittleJoker' | 'BigJoker';

// A playing card
export interface Card {
  suit: Suit | null; // null for jokers
  rank: Rank;
}

// Seat positions (fixed order for turn rotation)
export type Seat = 'N' | 'E' | 'S' | 'W';
export const SEATS: readonly Seat[] = ['N', 'E', 'S', 'W'] as const;
export const SEAT_ORDER: Record<Seat, number> = { N: 0, E: 1, S: 2, W: 3 };

// Teams: NS (North-South) vs EW (East-West)
export type Team = 'NS' | 'EW';

// Get team for a seat
export function getTeam(seat: Seat): Team {
  return seat === 'N' || seat === 'S' ? 'NS' : 'EW';
}

// Get partner seat
export function getPartner(seat: Seat): Seat {
  const partners: Record<Seat, Seat> = { N: 'S', S: 'N', E: 'W', W: 'E' };
  return partners[seat];
}

// Get next seat in turn order
export function getNextSeat(seat: Seat): Seat {
  const order: Seat[] = ['N', 'E', 'S', 'W'];
  return order[(SEAT_ORDER[seat] + 1) % 4]!;
}

// Game modes with different rules
export type GameMode = 'aceHigh' | 'threeJokers' | 'straightStruggle';

// Target score options
export type TargetScore = 250 | 500;

// Game phases
export type GamePhase =
  | 'LOBBY'      // Waiting for players
  | 'DEAL'       // Cards being dealt
  | 'REDEAL_OFFER' // Offering redeal to eligible player
  | 'BIDDING'    // Players submitting bids
  | 'PLAYING'    // Playing books
  | 'HAND_END'   // Hand finished, showing results
  | 'GAME_END';  // Game over

// Player state within a room
export interface Player {
  id: string;
  name: string;
  socketId: string | null;
  reconnectToken: string;
  ready: boolean;
  connected: boolean;
  isCPU: boolean;
}

// Seat state
export interface SeatState {
  seat: Seat;
  playerId: string | null;
  player: Player | null;
}

// A single played card in a book
export interface PlayedCard {
  seat: Seat;
  card: Card;
}

// A completed book
export interface Book {
  plays: PlayedCard[];
  leadSuit: Suit | null;
  winner: Seat;
}

// Per-team state for current hand
export interface TeamHandState {
  bid: number;
  booksWon: number;
}

// Per-team state for entire game
export interface TeamGameState {
  score: number;
  setsCount: number;
}

// Full game state (hand-level)
export interface HandState {
  handIndex: number;
  phase: GamePhase;
  dealerSeat: Seat;
  currentTurn: Seat | null;
  hands: Record<Seat, Card[]>;
  bids: Partial<Record<Seat, number>>;
  currentBook: PlayedCard[];
  leadSuit: Suit | null;
  completedBooks: Book[];
  teamStates: Record<Team, TeamHandState>;
  spadesBroken: boolean;
  redealUsed: boolean;
  redealOfferedTo: Seat | null;
}

// Full room/game state
export interface RoomState {
  code: string;
  mode: GameMode;
  targetScore: TargetScore;
  hostPlayerId: string;
  seats: Record<Seat, SeatState>;
  teamGameStates: Record<Team, TeamGameState>;
  hand: HandState | null;
  phase: GamePhase;
  gameRedealUsed: boolean;
  winner: Team | null;
  winReason: 'score' | 'firstHandDime' | 'threeSetLoss' | null;
}

// Public room state (safe to send to all players)
export interface PublicRoomState {
  code: string;
  mode: GameMode;
  targetScore: TargetScore;
  phase: GamePhase;
  hostPlayerId: string;
  seats: Record<Seat, {
    seat: Seat;
    playerId: string | null;
    playerName: string | null;
    ready: boolean;
    connected: boolean;
    isCPU: boolean;
  }>;
  teamGameStates: Record<Team, TeamGameState>;
  hand: PublicHandState | null;
  winner: Team | null;
  winReason: 'score' | 'firstHandDime' | 'threeSetLoss' | null;
  gameRedealUsed: boolean;
}

// Public hand state (no private cards)
export interface PublicHandState {
  handIndex: number;
  phase: GamePhase;
  dealerSeat: Seat;
  currentTurn: Seat | null;
  bids: Partial<Record<Seat, number>>;
  currentBook: PlayedCard[];
  leadSuit: Suit | null;
  completedBooks: Book[];
  teamStates: Record<Team, TeamHandState>;
  spadesBroken: boolean;
  redealUsed: boolean;
  redealOfferedTo: Seat | null;
  handSizes: Record<Seat, number>;
}

// Hand end results for display
export interface HandEndResult {
  team: Team;
  bid: number;
  booksWon: number;
  overbooks: number;
  isSet: boolean;
  isDime: boolean;
  pointsEarned: number;
  newScore: number;
  setsCount: number;
}
