'use client'

import { useState } from 'react'

export function DeleteButton({ releaseId }: { releaseId: string }) {
  const [loading, setLoading] = useState(false)
  const [deleted, setDeleted] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/music/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseId }),
      })
      if (res.ok) setDeleted(true)
    } catch { /* ignore */ }
    setLoading(false)
  }

  if (deleted) return null

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="px-1.5 py-0.5 text-xs rounded text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors disabled:opacity-50"
      aria-label="Delete release"
    >
      {loading ? '...' : '×'}
    </button>
  )
}
