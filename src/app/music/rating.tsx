'use client'

import { useState } from 'react'

interface RatingProps {
  releaseId: string
  initialAverage: number
  initialCount: number
}

export function PlusRating({ releaseId, initialAverage, initialCount }: RatingProps) {
  const [hovering, setHovering] = useState(0)
  const [userRating, setUserRating] = useState(0)
  const [average, setAverage] = useState(initialAverage)
  const [count, setCount] = useState(initialCount)
  const [submitting, setSubmitting] = useState(false)

  async function handleRate(rating: number) {
    if (submitting) return
    setSubmitting(true)
    setUserRating(rating)

    try {
      const res = await fetch('/api/music/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseId, rating }),
      })

      if (res.ok) {
        const data = await res.json()
        setAverage(data.average)
        setCount(data.count)
      }
    } catch {
      // Silently fail — the UI already shows the optimistic state
    } finally {
      setSubmitting(false)
    }
  }

  const displayRating = hovering || userRating

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onMouseEnter={() => setHovering(n)}
            onMouseLeave={() => setHovering(0)}
            onClick={() => handleRate(n)}
            disabled={submitting}
            className={`text-lg font-bold transition-colors select-none px-0.5 ${
              n <= displayRating
                ? 'text-[var(--accent-primary)]'
                : 'text-[var(--border-default)] hover:text-[var(--accent-primary)]'
            } ${submitting ? 'opacity-50' : 'cursor-pointer'}`}
            aria-label={`Rate ${n} out of 5`}
          >
            +
          </button>
        ))}
      </div>
      {count > 0 && (
        <span className="text-xs text-[var(--text-muted)]">
          {average.toFixed(1)} avg ({count} {count === 1 ? 'rating' : 'ratings'})
        </span>
      )}
    </div>
  )
}
