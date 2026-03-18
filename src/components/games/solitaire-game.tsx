'use client'

import { useEffect, useCallback, useState } from 'react'
import type { Card } from '@/lib/solitaire/types'
import { isRed, suitSymbol, FOUNDATION_SUITS } from '@/lib/solitaire/engine'
import { useSolitaireStore } from '@/lib/solitaire/store'

/* ─── Card Components ──────────────────────────── */

function SolitaireCard({
  card,
  onClick,
  onDoubleClick,
  selected,
  clickable,
  small,
}: {
  card: Card
  onClick?: () => void
  onDoubleClick?: () => void
  selected?: boolean
  clickable?: boolean
  small?: boolean
}) {
  if (!card.faceUp) {
    return (
      <div
        className={`playing-card ${small ? 'playing-card-sm' : 'playing-card-md'} playing-card-back ${clickable ? 'cursor-pointer' : ''}`}
        onClick={clickable ? onClick : undefined}
      />
    )
  }

  const red = isRed(card.suit)
  const colorClass = red ? 'playing-card-red' : 'playing-card-black'
  const sym = suitSymbol(card.suit)

  return (
    <div
      className={`playing-card ${small ? 'playing-card-sm' : 'playing-card-md'} ${colorClass} ${selected ? 'ring-2 ring-[var(--accent-primary)] shadow-lg' : ''} ${clickable ? 'cursor-pointer active:scale-95 transition-transform' : ''}`}
      onClick={clickable ? onClick : undefined}
      onDoubleClick={clickable ? onDoubleClick : undefined}
    >
      {card.rank}{sym}
    </div>
  )
}

function EmptySlot({ label, onClick, small }: { label?: string; onClick?: () => void; small?: boolean }) {
  return (
    <div
      className={`playing-card ${small ? 'playing-card-sm' : 'playing-card-md'} border-dashed border-2 border-[var(--border-default)] bg-transparent ${onClick ? 'cursor-pointer' : ''}`}
      style={{ boxShadow: 'none' }}
      onClick={onClick}
    >
      {label && (
        <span className="text-[var(--text-tertiary)] opacity-50 text-lg">{label}</span>
      )}
    </div>
  )
}

/* ─── Time Formatting ──────────────────────────── */

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/* ─── Main Game Component ──────────────────────── */

export function SolitaireGame() {
  const game = useSolitaireStore(s => s.game)
  const selectedCard = useSolitaireStore(s => s.selectedCard)
  const elapsed = useSolitaireStore(s => s.elapsed)
  const newGame = useSolitaireStore(s => s.newGame)
  const drawCard = useSolitaireStore(s => s.drawCard)
  const selectCard = useSolitaireStore(s => s.selectCard)
  const clearSelection = useSolitaireStore(s => s.clearSelection)
  const moveToFoundation = useSolitaireStore(s => s.moveToFoundation)
  const moveToTableau = useSolitaireStore(s => s.moveToTableau)
  const autoMoveToFoundation = useSolitaireStore(s => s.autoMoveToFoundation)
  const autoCompleteAll = useSolitaireStore(s => s.autoCompleteAll)
  const tick = useSolitaireStore(s => s.tick)

  // Start game on mount
  useEffect(() => {
    if (!game) newGame()
  }, [game, newGame])

  // Timer
  useEffect(() => {
    if (!game || game.won) return
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [game, game?.won, tick])

  // Responsive: detect small screen
  const [useSmallCards, setUseSmallCards] = useState(false)
  useEffect(() => {
    const check = () => setUseSmallCards(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleStockClick = useCallback(() => {
    drawCard()
  }, [drawCard])

  const handleWasteClick = useCallback(() => {
    selectCard('waste')
  }, [selectCard])

  const handleWasteDoubleClick = useCallback(() => {
    autoMoveToFoundation('waste')
  }, [autoMoveToFoundation])

  const handleFoundationClick = useCallback((fi: number) => {
    if (!selectedCard) return
    moveToFoundation(fi)
  }, [selectedCard, moveToFoundation])

  const handleTableauCardClick = useCallback((colIndex: number, cardIndex: number) => {
    if (!game) return
    const col = game.tableau[colIndex]
    const card = col[cardIndex]
    if (!card.faceUp) return

    // If something is selected, try to move to this column
    if (selectedCard) {
      moveToTableau(colIndex)
      return
    }

    // Select this card
    selectCard('tableau', colIndex, cardIndex)
  }, [game, selectedCard, selectCard, moveToTableau])

  const handleTableauDoubleClick = useCallback((colIndex: number, cardIndex: number) => {
    if (!game) return
    const col = game.tableau[colIndex]
    // Only auto-move the top card
    if (cardIndex === col.length - 1) {
      autoMoveToFoundation('tableau', colIndex)
    }
  }, [game, autoMoveToFoundation])

  const handleEmptyTableauClick = useCallback((colIndex: number) => {
    if (!selectedCard) return
    moveToTableau(colIndex)
  }, [selectedCard, moveToTableau])

  const handleBackgroundClick = useCallback(() => {
    if (selectedCard) clearSelection()
  }, [selectedCard, clearSelection])

  const isCardSelected = useCallback((source: 'waste' | 'tableau', colIndex?: number, cardIndex?: number): boolean => {
    if (!selectedCard) return false
    if (selectedCard.source !== source) return false
    if (source === 'waste') return true
    if (selectedCard.colIndex !== colIndex) return false
    // For tableau, highlight the selected card and all cards below it
    if (selectedCard.cardIndex !== undefined && cardIndex !== undefined) {
      return cardIndex >= selectedCard.cardIndex
    }
    return false
  }, [selectedCard])

  if (!game) return null

  const small = useSmallCards

  return (
    <div onClick={handleBackgroundClick}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1
            className="text-xl font-bold text-[var(--text-primary)]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Solitaire
          </h1>
          <button
            onClick={(e) => { e.stopPropagation(); newGame() }}
            className="btn btn-sm"
          >
            New Game
          </button>
          {game.stock.length === 0 && game.waste.length === 0 && game.tableau.every(c => c.every(card => card.faceUp)) && !game.won && (
            <button
              onClick={(e) => { e.stopPropagation(); autoCompleteAll() }}
              className="btn btn-sm"
            >
              Auto Complete
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
          <span>Moves: {game.moves}</span>
          <span>Time: {formatTime(elapsed)}</span>
        </div>
      </div>

      {/* Win message */}
      {game.won && (
        <div className="card p-6 mb-4 text-center">
          <h2
            className="text-2xl font-bold text-[var(--accent-primary)] mb-2"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Congratulations!
          </h2>
          <p className="text-[var(--text-secondary)]">
            You won in {game.moves} moves and {formatTime(elapsed)}!
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); newGame() }}
            className="btn mt-4"
          >
            Play Again
          </button>
        </div>
      )}

      {/* Top row: Stock, Waste, Foundations */}
      <div className="flex items-start justify-between mb-4 gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
        {/* Stock and Waste */}
        <div className="flex items-start gap-2">
          {/* Stock */}
          {game.stock.length > 0 ? (
            <div
              className={`playing-card ${small ? 'playing-card-sm' : 'playing-card-md'} playing-card-back cursor-pointer`}
              onClick={handleStockClick}
            />
          ) : game.waste.length > 0 ? (
            <div
              className={`playing-card ${small ? 'playing-card-sm' : 'playing-card-md'} border-dashed border-2 border-[var(--border-default)] bg-transparent cursor-pointer`}
              style={{ boxShadow: 'none' }}
              onClick={handleStockClick}
            >
              <span className="text-[var(--text-tertiary)] text-lg">&#x21BB;</span>
            </div>
          ) : (
            <EmptySlot small={small} />
          )}

          {/* Waste */}
          {game.waste.length > 0 ? (
            <SolitaireCard
              card={game.waste[game.waste.length - 1]}
              onClick={handleWasteClick}
              onDoubleClick={handleWasteDoubleClick}
              selected={isCardSelected('waste')}
              clickable
              small={small}
            />
          ) : (
            <EmptySlot small={small} />
          )}
        </div>

        {/* Foundations */}
        <div className="flex items-start gap-2">
          {FOUNDATION_SUITS.map((suit, fi) => {
            const foundation = game.foundations[fi]
            if (foundation.length > 0) {
              const topCard = foundation[foundation.length - 1]
              return (
                <SolitaireCard
                  key={fi}
                  card={topCard}
                  onClick={() => handleFoundationClick(fi)}
                  clickable={!!selectedCard}
                  small={small}
                />
              )
            }
            return (
              <EmptySlot
                key={fi}
                label={suitSymbol(suit)}
                onClick={() => handleFoundationClick(fi)}
                small={small}
              />
            )
          })}
        </div>
      </div>

      {/* Tableau */}
      <div
        className="grid grid-cols-7 gap-1 sm:gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {game.tableau.map((column, colIndex) => (
          <div key={colIndex} className="flex flex-col items-center min-h-[100px]">
            {column.length === 0 ? (
              <EmptySlot
                onClick={() => handleEmptyTableauClick(colIndex)}
                small={small}
              />
            ) : (
              column.map((card, cardIndex) => (
                <div
                  key={cardIndex}
                  style={{
                    marginTop: cardIndex === 0 ? 0 : card.faceUp ? (small ? -38 : -48) : (small ? -42 : -58),
                    zIndex: cardIndex,
                    position: 'relative',
                  }}
                >
                  <SolitaireCard
                    card={card}
                    onClick={() => handleTableauCardClick(colIndex, cardIndex)}
                    onDoubleClick={() => handleTableauDoubleClick(colIndex, cardIndex)}
                    selected={isCardSelected('tableau', colIndex, cardIndex)}
                    clickable={card.faceUp}
                    small={small}
                  />
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
