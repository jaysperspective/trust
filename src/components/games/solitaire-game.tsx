'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import type { Card } from '@/lib/solitaire/types'
import { isRed, suitSymbol, FOUNDATION_SUITS, timeBonus } from '@/lib/solitaire/engine'
import { useSolitaireStore } from '@/lib/solitaire/store'

/* ─── Drag State ──────────────────────────────── */

interface DragInfo {
  source: 'waste' | 'tableau'
  colIndex?: number
  cardIndex?: number
  cards: Card[]
  startX: number
  startY: number
  offsetX: number
  offsetY: number
}

/* ─── Card Components ──────────────────────────── */

function SolitaireCard({
  card,
  onClick,
  onDoubleClick,
  onDragStart,
  selected,
  clickable,
  small,
  dragging,
}: {
  card: Card
  onClick?: () => void
  onDoubleClick?: () => void
  onDragStart?: (e: React.MouseEvent | React.TouchEvent) => void
  selected?: boolean
  clickable?: boolean
  small?: boolean
  dragging?: boolean
}) {
  if (!card.faceUp) {
    return (
      <div
        className={`playing-card ${small ? 'playing-card-xs' : 'playing-card-sm'} playing-card-back ${clickable ? 'cursor-pointer' : ''}`}
        onClick={clickable ? onClick : undefined}
      />
    )
  }

  const red = isRed(card.suit)
  const colorClass = red ? 'playing-card-red' : 'playing-card-black'
  const sym = suitSymbol(card.suit)

  return (
    <div
      className={`playing-card ${small ? 'playing-card-xs' : 'playing-card-sm'} ${colorClass} ${selected ? 'ring-2 ring-[var(--accent-primary)] shadow-lg' : ''} ${clickable && !dragging ? 'cursor-grab active:cursor-grabbing' : ''} ${dragging ? 'opacity-40' : ''}`}
      onClick={clickable ? onClick : undefined}
      onDoubleClick={clickable ? onDoubleClick : undefined}
      onMouseDown={clickable ? onDragStart : undefined}
      onTouchStart={clickable ? onDragStart : undefined}
    >
      {card.rank}{sym}
    </div>
  )
}

function EmptySlot({ label, onClick, small, onDrop }: { label?: string; onClick?: () => void; small?: boolean; onDrop?: () => void }) {
  return (
    <div
      className={`playing-card ${small ? 'playing-card-xs' : 'playing-card-sm'} border-dashed border-2 border-[var(--border-default)] bg-transparent ${onClick || onDrop ? 'cursor-pointer' : ''}`}
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
  const autoMove = useSolitaireStore(s => s.autoMove)
  const dropCard = useSolitaireStore(s => s.dropCard)
  const drawAndDrag = useSolitaireStore(s => s.drawAndDrag)
  const autoCompleteAll = useSolitaireStore(s => s.autoCompleteAll)
  const tick = useSolitaireStore(s => s.tick)

  // Drag state
  const [drag, setDrag] = useState<DragInfo | null>(null)
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 })
  const didDragRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const foundationRefs = useRef<(HTMLDivElement | null)[]>([])
  const tableauRefs = useRef<(HTMLDivElement | null)[]>([])

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

  // Drag handlers
  const startDrag = useCallback((
    e: React.MouseEvent | React.TouchEvent,
    source: 'waste' | 'tableau',
    cards: Card[],
    colIndex?: number,
    cardIndex?: number,
  ) => {
    e.preventDefault()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()

    setDrag({
      source,
      colIndex,
      cardIndex,
      cards,
      startX: clientX,
      startY: clientY,
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top,
    })
    setDragPos({ x: clientX, y: clientY })
  }, [])

  useEffect(() => {
    if (!drag) return

    const onMove = (e: MouseEvent | TouchEvent) => {
      if ('touches' in e) e.preventDefault()
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      setDragPos({ x: clientX, y: clientY })
    }

    const onEnd = (e: MouseEvent | TouchEvent) => {
      const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX
      const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY

      // Check if it was just a click (minimal movement)
      const dx = Math.abs(clientX - drag.startX)
      const dy = Math.abs(clientY - drag.startY)
      if (dx < 5 && dy < 5) {
        setDrag(null)
        return // Let the click handler deal with it
      }

      // Suppress the click event that follows mouseup
      didDragRef.current = true
      setTimeout(() => { didDragRef.current = false }, 0)

      // Find drop target — check foundations first
      let handled = false

      for (let fi = 0; fi < 4; fi++) {
        const el = foundationRefs.current[fi]
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
          dropCard(drag.source, drag.colIndex, drag.cardIndex, 'foundation', fi)
          handled = true
          break
        }
      }

      // Check tableau columns
      if (!handled) {
        for (let ci = 0; ci < 7; ci++) {
          const el = tableauRefs.current[ci]
          if (!el) continue
          const rect = el.getBoundingClientRect()
          if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
            dropCard(drag.source, drag.colIndex, drag.cardIndex, 'tableau', ci)
            handled = true
            break
          }
        }
      }

      setDrag(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [drag, dropCard])

  const handleStockClick = useCallback(() => {
    if (didDragRef.current) return
    drawCard()
  }, [drawCard])

  const handleStockDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!game || game.stock.length === 0) return
    const card = drawAndDrag()
    if (!card) return
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    setDrag({
      source: 'waste',
      cards: [card],
      startX: clientX,
      startY: clientY,
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top,
    })
    setDragPos({ x: clientX, y: clientY })
  }, [game, drawAndDrag])

  const handleWasteClick = useCallback(() => {
    if (didDragRef.current) return
    selectCard('waste')
  }, [selectCard])

  const handleWasteDoubleClick = useCallback(() => {
    autoMove('waste')
  }, [autoMove])

  const handleWasteDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!game || game.waste.length === 0) return
    const card = game.waste[game.waste.length - 1]
    startDrag(e, 'waste', [card])
  }, [game, startDrag])

  const handleFoundationClick = useCallback((fi: number) => {
    if (didDragRef.current) return
    if (!selectedCard) return
    moveToFoundation(fi)
  }, [selectedCard, moveToFoundation])

  const handleTableauCardClick = useCallback((colIndex: number, cardIndex: number) => {
    if (didDragRef.current) return
    if (!game) return
    const col = game.tableau[colIndex]
    const card = col[cardIndex]
    if (!card.faceUp) return

    if (selectedCard) {
      moveToTableau(colIndex)
      return
    }

    selectCard('tableau', colIndex, cardIndex)
  }, [game, selectedCard, selectCard, moveToTableau])

  const handleTableauDoubleClick = useCallback((colIndex: number, cardIndex: number) => {
    if (!game) return
    autoMove('tableau', colIndex, cardIndex)
  }, [game, autoMove])

  const handleTableauDragStart = useCallback((e: React.MouseEvent | React.TouchEvent, colIndex: number, cardIndex: number) => {
    if (!game) return
    const col = game.tableau[colIndex]
    const card = col[cardIndex]
    if (!card.faceUp) return
    const cards = col.slice(cardIndex)
    startDrag(e, 'tableau', cards, colIndex, cardIndex)
  }, [game, startDrag])

  const handleEmptyTableauClick = useCallback((colIndex: number) => {
    if (didDragRef.current) return
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
    if (selectedCard.cardIndex !== undefined && cardIndex !== undefined) {
      return cardIndex >= selectedCard.cardIndex
    }
    return false
  }, [selectedCard])

  const isDragging = useCallback((source: 'waste' | 'tableau', colIndex?: number, cardIndex?: number): boolean => {
    if (!drag) return false
    if (drag.source !== source) return false
    if (source === 'waste') return true
    if (drag.colIndex !== colIndex) return false
    if (drag.cardIndex !== undefined && cardIndex !== undefined) {
      return cardIndex >= drag.cardIndex
    }
    return false
  }, [drag])

  if (!game) return null

  const small = useSmallCards
  const cardW = small ? 30 : 36
  const cardH = small ? 42 : 50
  const faceUpOverlap = small ? -30 : -35
  const faceDownOverlap = small ? -35 : -42

  return (
    <div ref={containerRef} onClick={handleBackgroundClick} style={{ position: 'relative' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
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
          <span>Score: {game.score}</span>
          <span>Moves: {game.moves}</span>
          <span>Time: {formatTime(elapsed)}</span>
        </div>
      </div>

      {/* Win message */}
      {game.won && (() => {
        const bonus = timeBonus(elapsed)
        const finalScore = game.score + bonus
        return (
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
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Score: {game.score} + {bonus} time bonus = <span className="font-bold text-[var(--text-primary)]">{finalScore}</span>
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); newGame() }}
              className="btn mt-4"
            >
              Play Again
            </button>
          </div>
        )
      })()}

      {/* Top row: Stock, Waste, Foundations */}
      <div className="flex items-start justify-between mb-2 gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
        {/* Stock and Waste */}
        <div className="flex items-start gap-1">
          {/* Stock */}
          {game.stock.length > 0 ? (
            <div
              className={`playing-card ${small ? 'playing-card-xs' : 'playing-card-sm'} playing-card-back cursor-pointer`}
              onClick={handleStockClick}
              onMouseDown={handleStockDragStart}
              onTouchStart={handleStockDragStart}
            />
          ) : game.waste.length > 0 ? (
            <div
              className={`playing-card ${small ? 'playing-card-xs' : 'playing-card-sm'} border-dashed border-2 border-[var(--border-default)] bg-transparent cursor-pointer`}
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
              onDragStart={handleWasteDragStart}
              selected={isCardSelected('waste')}
              clickable
              small={small}
              dragging={isDragging('waste')}
            />
          ) : (
            <EmptySlot small={small} />
          )}
        </div>

        {/* Foundations */}
        <div className="flex items-start gap-1">
          {FOUNDATION_SUITS.map((suit, fi) => {
            const foundation = game.foundations[fi]
            return (
              <div key={fi} ref={el => { foundationRefs.current[fi] = el }}>
                {foundation.length > 0 ? (
                  <SolitaireCard
                    card={foundation[foundation.length - 1]}
                    onClick={() => handleFoundationClick(fi)}
                    clickable={!!selectedCard}
                    small={small}
                  />
                ) : (
                  <EmptySlot
                    label={suitSymbol(suit)}
                    onClick={() => handleFoundationClick(fi)}
                    small={small}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Tableau */}
      <div
        className="grid grid-cols-7 gap-0.5 sm:gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        {game.tableau.map((column, colIndex) => (
          <div
            key={colIndex}
            ref={el => { tableauRefs.current[colIndex] = el }}
            className="flex flex-col items-center min-h-[60px]"
          >
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
                    marginTop: cardIndex === 0 ? 0 : card.faceUp ? faceUpOverlap : faceDownOverlap,
                    zIndex: cardIndex,
                    position: 'relative',
                  }}
                >
                  <SolitaireCard
                    card={card}
                    onClick={() => handleTableauCardClick(colIndex, cardIndex)}
                    onDoubleClick={() => handleTableauDoubleClick(colIndex, cardIndex)}
                    onDragStart={(e) => handleTableauDragStart(e, colIndex, cardIndex)}
                    selected={isCardSelected('tableau', colIndex, cardIndex)}
                    clickable={card.faceUp}
                    small={small}
                    dragging={isDragging('tableau', colIndex, cardIndex)}
                  />
                </div>
              ))
            )}
          </div>
        ))}
      </div>

      {/* Drag ghost */}
      {drag && (
        <div
          style={{
            position: 'fixed',
            left: dragPos.x - drag.offsetX,
            top: dragPos.y - drag.offsetY,
            zIndex: 10000,
            pointerEvents: 'none',
            touchAction: 'none',
          }}
        >
          {drag.cards.map((card, i) => {
            const red = isRed(card.suit)
            const sym = suitSymbol(card.suit)
            return (
              <div
                key={i}
                className={`playing-card ${small ? 'playing-card-xs' : 'playing-card-sm'} ${red ? 'playing-card-red' : 'playing-card-black'}`}
                style={{
                  marginTop: i === 0 ? 0 : small ? 10 : 15,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
                  position: 'relative',
                }}
              >
                {card.rank}{sym}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
