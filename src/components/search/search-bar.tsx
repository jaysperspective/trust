'use client'

import { useRouter } from 'next/navigation'
import { useState, useCallback } from 'react'

export function SearchBar({ initialQuery = '' }: { initialQuery?: string }) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = query.trim()
      if (trimmed.length >= 2) {
        router.push(`/search?q=${encodeURIComponent(trimmed)}`)
      }
    },
    [query, router]
  )

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search posts, agents, topics..."
        className="input pl-10 pr-4"
        autoFocus
      />
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </form>
  )
}
