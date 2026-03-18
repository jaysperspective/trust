import type { Card, GameState, Suit, Rank } from './types'

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

// Foundation order: index 0=spades, 1=hearts, 2=diamonds, 3=clubs
export const FOUNDATION_SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']

export function rankValue(rank: Rank): number {
  const map: Record<Rank, number> = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13,
  }
  return map[rank]
}

export function isRed(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds'
}

const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '\u2660',
  hearts: '\u2665',
  diamonds: '\u2666',
  clubs: '\u2663',
}

export function formatCard(card: Card): string {
  return `${card.rank}${SUIT_SYMBOLS[card.suit]}`
}

export function suitSymbol(suit: Suit): string {
  return SUIT_SYMBOLS[suit]
}

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, faceUp: false })
    }
  }
  return deck
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function deal(): GameState {
  const deck = shuffle(createDeck())
  const tableau: Card[][] = []
  let idx = 0

  for (let col = 0; col < 7; col++) {
    const column: Card[] = []
    for (let row = 0; row <= col; row++) {
      const card = { ...deck[idx] }
      card.faceUp = row === col // only top card face up
      column.push(card)
      idx++
    }
    tableau.push(column)
  }

  const stock = deck.slice(idx).map(c => ({ ...c, faceUp: false }))

  return {
    tableau,
    foundations: [[], [], [], []],
    stock,
    waste: [],
    moves: 0,
    score: 0,
    won: false,
    startedAt: Date.now(),
  }
}

export function canPlaceOnTableau(card: Card, column: Card[]): boolean {
  if (column.length === 0) {
    return card.rank === 'K'
  }
  const topCard = column[column.length - 1]
  if (!topCard.faceUp) return false
  // Alternating colors
  if (isRed(card.suit) === isRed(topCard.suit)) return false
  // Descending rank
  return rankValue(topCard.rank) - rankValue(card.rank) === 1
}

export function canPlaceOnFoundation(card: Card, foundation: Card[], foundationIndex: number): boolean {
  const expectedSuit = FOUNDATION_SUITS[foundationIndex]
  if (card.suit !== expectedSuit) return false

  if (foundation.length === 0) {
    return card.rank === 'A'
  }
  const topCard = foundation[foundation.length - 1]
  return rankValue(card.rank) - rankValue(topCard.rank) === 1
}

function flipTopCard(column: Card[]): { col: Card[]; flipped: boolean } {
  if (column.length === 0) return { col: column, flipped: false }
  const last = column[column.length - 1]
  if (last.faceUp) return { col: column, flipped: false }
  return { col: [...column.slice(0, -1), { ...last, faceUp: true }], flipped: true }
}

export function drawFromStock(state: GameState): GameState {
  if (state.stock.length === 0) return state
  const card = { ...state.stock[state.stock.length - 1], faceUp: true }
  return {
    ...state,
    stock: state.stock.slice(0, -1),
    waste: [...state.waste, card],
    moves: state.moves + 1,
  }
}

export function resetStock(state: GameState): GameState {
  if (state.stock.length > 0) return state
  if (state.waste.length === 0) return state
  const newStock = [...state.waste].reverse().map(c => ({ ...c, faceUp: false }))
  return {
    ...state,
    stock: newStock,
    waste: [],
    moves: state.moves + 1,
    score: Math.max(0, state.score - 100),
  }
}

export function moveWasteToTableau(state: GameState, colIndex: number): GameState {
  if (state.waste.length === 0) return state
  const card = state.waste[state.waste.length - 1]
  const column = state.tableau[colIndex]
  if (!canPlaceOnTableau(card, column)) return state

  const newTableau = state.tableau.map((col, i) =>
    i === colIndex ? [...col, { ...card }] : col
  )

  return {
    ...state,
    waste: state.waste.slice(0, -1),
    tableau: newTableau,
    moves: state.moves + 1,
    score: state.score + 5,
  }
}

export function moveWasteToFoundation(state: GameState, foundIndex: number): GameState {
  if (state.waste.length === 0) return state
  const card = state.waste[state.waste.length - 1]
  if (!canPlaceOnFoundation(card, state.foundations[foundIndex], foundIndex)) return state

  const newFoundations = state.foundations.map((f, i) =>
    i === foundIndex ? [...f, { ...card }] : f
  )

  const newState: GameState = {
    ...state,
    waste: state.waste.slice(0, -1),
    foundations: newFoundations,
    moves: state.moves + 1,
    score: state.score + 10,
  }
  return { ...newState, won: checkWin(newState) }
}

export function moveTableauToTableau(
  state: GameState,
  fromCol: number,
  cardIndex: number,
  toCol: number
): GameState {
  if (fromCol === toCol) return state
  const sourceColumn = state.tableau[fromCol]
  if (cardIndex < 0 || cardIndex >= sourceColumn.length) return state

  const movingCard = sourceColumn[cardIndex]
  if (!movingCard.faceUp) return state

  const targetColumn = state.tableau[toCol]
  if (!canPlaceOnTableau(movingCard, targetColumn)) return state

  // Verify the sequence being moved is valid (alternating colors, descending)
  const cardsToMove = sourceColumn.slice(cardIndex)
  for (let i = 1; i < cardsToMove.length; i++) {
    const prev = cardsToMove[i - 1]
    const curr = cardsToMove[i]
    if (isRed(prev.suit) === isRed(curr.suit)) return state
    if (rankValue(prev.rank) - rankValue(curr.rank) !== 1) return state
  }

  const { col: remaining, flipped } = flipTopCard(sourceColumn.slice(0, cardIndex))

  const newTableau = state.tableau.map((col, i) => {
    if (i === fromCol) return remaining
    if (i === toCol) return [...col, ...cardsToMove]
    return col
  })

  return {
    ...state,
    tableau: newTableau,
    moves: state.moves + 1,
    score: state.score + (flipped ? 5 : 0),
  }
}

export function moveTableauToFoundation(state: GameState, colIndex: number, foundIndex: number): GameState {
  const column = state.tableau[colIndex]
  if (column.length === 0) return state

  const card = column[column.length - 1]
  if (!card.faceUp) return state
  if (!canPlaceOnFoundation(card, state.foundations[foundIndex], foundIndex)) return state

  const { col: remaining, flipped } = flipTopCard(column.slice(0, -1))

  const newTableau = state.tableau.map((col, i) =>
    i === colIndex ? remaining : col
  )
  const newFoundations = state.foundations.map((f, i) =>
    i === foundIndex ? [...f, { ...card }] : f
  )

  const newState: GameState = {
    ...state,
    tableau: newTableau,
    foundations: newFoundations,
    moves: state.moves + 1,
    score: state.score + 10 + (flipped ? 5 : 0),
  }
  return { ...newState, won: checkWin(newState) }
}

export function checkWin(state: GameState): boolean {
  return state.foundations.every(f => f.length === 13)
}

export function allCardsFaceUp(state: GameState): boolean {
  if (state.stock.length > 0 || state.waste.length > 0) return false
  return state.tableau.every(col => col.every(c => c.faceUp))
}

export function autoComplete(state: GameState): GameState {
  let current = { ...state }
  let moved = true

  while (moved) {
    moved = false

    // Try moving waste to foundation
    if (current.waste.length > 0) {
      const card = current.waste[current.waste.length - 1]
      for (let fi = 0; fi < 4; fi++) {
        if (canPlaceOnFoundation(card, current.foundations[fi], fi)) {
          current = moveWasteToFoundation(current, fi)
          moved = true
          break
        }
      }
      if (moved) continue
    }

    // Try moving tableau tops to foundation
    for (let ci = 0; ci < 7; ci++) {
      const col = current.tableau[ci]
      if (col.length === 0) continue
      const card = col[col.length - 1]
      if (!card.faceUp) continue
      for (let fi = 0; fi < 4; fi++) {
        if (canPlaceOnFoundation(card, current.foundations[fi], fi)) {
          current = moveTableauToFoundation(current, ci, fi)
          moved = true
          break
        }
      }
      if (moved) break
    }
  }

  return current
}

/** Find the foundation index for a given card's suit */
export function foundationIndexForSuit(suit: Suit): number {
  return FOUNDATION_SUITS.indexOf(suit)
}

/** Try to auto-move a single card to its foundation */
export function tryAutoMoveToFoundation(
  state: GameState,
  source: 'waste' | 'tableau',
  colIndex?: number
): GameState | null {
  if (source === 'waste') {
    if (state.waste.length === 0) return null
    const card = state.waste[state.waste.length - 1]
    const fi = foundationIndexForSuit(card.suit)
    if (canPlaceOnFoundation(card, state.foundations[fi], fi)) {
      return moveWasteToFoundation(state, fi)
    }
    return null
  }

  if (source === 'tableau' && colIndex !== undefined) {
    const col = state.tableau[colIndex]
    if (col.length === 0) return null
    const card = col[col.length - 1]
    if (!card.faceUp) return null
    const fi = foundationIndexForSuit(card.suit)
    if (canPlaceOnFoundation(card, state.foundations[fi], fi)) {
      return moveTableauToFoundation(state, colIndex, fi)
    }
    return null
  }

  return null
}

/** Calculate time bonus for winning (classic Klondike style) */
export function timeBonus(elapsedSeconds: number): number {
  if (elapsedSeconds <= 30) return 700
  if (elapsedSeconds >= 600) return 0
  return Math.max(0, Math.round(700000 / elapsedSeconds))
}
