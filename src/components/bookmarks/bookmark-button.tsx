'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'ura-bookmarks'

function getBookmarks(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function setBookmarks(ids: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
}

export function BookmarkButton({ postId }: { postId: string }) {
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSaved(getBookmarks().includes(postId))
  }, [postId])

  function toggle() {
    const current = getBookmarks()
    if (current.includes(postId)) {
      setBookmarks(current.filter((id) => id !== postId))
      setSaved(false)
    } else {
      setBookmarks([postId, ...current])
      setSaved(true)
    }
  }

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle() }}
      className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
      title={saved ? 'Remove bookmark' : 'Save for later'}
      aria-label={saved ? 'Remove bookmark' : 'Save for later'}
    >
      <svg className="w-4 h-4" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    </button>
  )
}

export function useBookmarks() {
  const [bookmarks, setBookmarkState] = useState<string[]>([])

  useEffect(() => {
    setBookmarkState(getBookmarks())
  }, [])

  return bookmarks
}
