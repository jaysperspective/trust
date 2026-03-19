'use client'

import { useState, useEffect } from 'react'

export function ExcludedArtists() {
  const [artists, setArtists] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/music/excluded-artists')
      .then(r => r.json())
      .then(data => setArtists(data.artists || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function addArtist() {
    const name = input.trim().toLowerCase()
    if (!name || artists.includes(name)) return
    const updated = [...artists, name]
    setSaving(true)
    try {
      const res = await fetch('/api/admin/music/excluded-artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artists: updated }),
      })
      if (res.ok) {
        const data = await res.json()
        setArtists(data.artists)
        setInput('')
      }
    } catch { /* ignore */ }
    setSaving(false)
  }

  async function removeArtist(name: string) {
    const updated = artists.filter(a => a !== name)
    setSaving(true)
    try {
      const res = await fetch('/api/admin/music/excluded-artists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artists: updated }),
      })
      if (res.ok) {
        const data = await res.json()
        setArtists(data.artists)
      }
    } catch { /* ignore */ }
    setSaving(false)
  }

  if (loading) return null

  return (
    <div className="mb-6 p-4 rounded-lg bg-[var(--bg-elevated)]">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Excluded Artists</h2>
      <p className="text-xs text-[var(--text-muted)] mb-3">
        These artists will be skipped when fetching new releases. &quot;Disney&quot; is always excluded.
      </p>

      {/* Add form */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addArtist()}
          placeholder="Artist name..."
          className="flex-1 px-3 py-1.5 text-sm rounded bg-[var(--bg-base)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
        />
        <button
          onClick={addArtist}
          disabled={saving || !input.trim()}
          className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--accent-primary)] text-white disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {/* List */}
      <div className="flex flex-wrap gap-2">
        {/* Hardcoded default */}
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-[var(--bg-base)] text-[var(--text-muted)]">
          disney
          <span className="text-[10px] opacity-50">(default)</span>
        </span>

        {artists.map(name => (
          <span
            key={name}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-[var(--bg-base)] text-[var(--text-primary)]"
          >
            {name}
            <button
              onClick={() => removeArtist(name)}
              disabled={saving}
              className="text-[var(--text-muted)] hover:text-red-400 ml-0.5 disabled:opacity-50"
              aria-label={`Remove ${name}`}
            >
              &times;
            </button>
          </span>
        ))}

        {artists.length === 0 && (
          <span className="text-xs text-[var(--text-muted)]">No custom exclusions added.</span>
        )}
      </div>
    </div>
  )
}
