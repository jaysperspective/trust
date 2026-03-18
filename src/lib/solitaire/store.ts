'use client'

import { create } from 'zustand'
import type { GameState } from './types'
import * as engine from './engine'

interface SelectedCard {
  source: 'waste' | 'tableau'
  colIndex?: number
  cardIndex?: number
}

interface SolitaireStore {
  game: GameState | null
  selectedCard: SelectedCard | null
  elapsed: number

  // Actions
  newGame: () => void
  drawCard: () => void
  selectCard: (source: 'waste' | 'tableau', colIndex?: number, cardIndex?: number) => void
  clearSelection: () => void
  moveToFoundation: (foundIndex: number) => void
  moveToTableau: (toCol: number) => void
  autoMoveToFoundation: (source: 'waste' | 'tableau', colIndex?: number) => void
  autoCompleteAll: () => void
  tick: () => void
}

export const useSolitaireStore = create<SolitaireStore>()((set, get) => ({
  game: null,
  selectedCard: null,
  elapsed: 0,

  newGame: () => {
    set({
      game: engine.deal(),
      selectedCard: null,
      elapsed: 0,
    })
  },

  drawCard: () => {
    const { game } = get()
    if (!game || game.won) return
    if (game.stock.length === 0) {
      set({ game: engine.resetStock(game), selectedCard: null })
    } else {
      set({ game: engine.drawFromStock(game), selectedCard: null })
    }
  },

  selectCard: (source, colIndex, cardIndex) => {
    const { game, selectedCard } = get()
    if (!game || game.won) return

    // If clicking same card, deselect
    if (
      selectedCard &&
      selectedCard.source === source &&
      selectedCard.colIndex === colIndex &&
      selectedCard.cardIndex === cardIndex
    ) {
      set({ selectedCard: null })
      return
    }

    // If something is already selected and we click a tableau column, try to move there
    if (selectedCard && source === 'tableau' && colIndex !== undefined) {
      const store = get()
      // Try moving to this column
      let newGame: GameState | null = null

      if (selectedCard.source === 'waste') {
        const result = engine.moveWasteToTableau(game, colIndex)
        if (result !== game) newGame = result
      } else if (selectedCard.source === 'tableau' && selectedCard.colIndex !== undefined && selectedCard.cardIndex !== undefined) {
        const result = engine.moveTableauToTableau(game, selectedCard.colIndex, selectedCard.cardIndex, colIndex)
        if (result !== game) newGame = result
      }

      if (newGame) {
        set({ game: newGame, selectedCard: null })
        return
      }
    }

    // Select this card
    set({ selectedCard: { source, colIndex, cardIndex } })
  },

  clearSelection: () => set({ selectedCard: null }),

  moveToFoundation: (foundIndex) => {
    const { game, selectedCard } = get()
    if (!game || !selectedCard || game.won) return

    let newGame: GameState | null = null

    if (selectedCard.source === 'waste') {
      const result = engine.moveWasteToFoundation(game, foundIndex)
      if (result !== game) newGame = result
    } else if (selectedCard.source === 'tableau' && selectedCard.colIndex !== undefined) {
      const result = engine.moveTableauToFoundation(game, selectedCard.colIndex, foundIndex)
      if (result !== game) newGame = result
    }

    if (newGame) {
      set({ game: newGame, selectedCard: null })
    }
  },

  moveToTableau: (toCol) => {
    const { game, selectedCard } = get()
    if (!game || !selectedCard || game.won) return

    let newGame: GameState | null = null

    if (selectedCard.source === 'waste') {
      const result = engine.moveWasteToTableau(game, toCol)
      if (result !== game) newGame = result
    } else if (selectedCard.source === 'tableau' && selectedCard.colIndex !== undefined && selectedCard.cardIndex !== undefined) {
      const result = engine.moveTableauToTableau(game, selectedCard.colIndex, selectedCard.cardIndex, toCol)
      if (result !== game) newGame = result
    }

    if (newGame) {
      set({ game: newGame, selectedCard: null })
    }
  },

  autoMoveToFoundation: (source, colIndex) => {
    const { game } = get()
    if (!game || game.won) return
    const result = engine.tryAutoMoveToFoundation(game, source, colIndex)
    if (result) {
      set({ game: result, selectedCard: null })
    }
  },

  autoCompleteAll: () => {
    const { game } = get()
    if (!game || game.won) return
    set({ game: engine.autoComplete(game), selectedCard: null })
  },

  tick: () => {
    const { game } = get()
    if (!game || game.won) return
    set({ elapsed: Math.floor((Date.now() - game.startedAt) / 1000) })
  },
}))
