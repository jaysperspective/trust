export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'

export interface Card {
  suit: Suit
  rank: Rank
  faceUp: boolean
}

export interface GameState {
  tableau: Card[][]      // 7 columns
  foundations: Card[][]   // 4 piles (spades, hearts, diamonds, clubs)
  stock: Card[]          // draw pile
  waste: Card[]          // flipped cards from stock
  moves: number
  won: boolean
  startedAt: number
}
