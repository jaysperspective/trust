'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { FeatureToggle } from './feature-toggle'

interface Release {
  id: string
  title: string
  artist: string
  coverUrl: string | null
  releaseDate: string | null
  genre: string | null
  releaseType: string
  topArtist: boolean
  featured: boolean
  ratingCount: number
}

export function ReleaseList({ releases }: { releases: Release[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleted, setDeleted] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const visible = releases.filter(r => !deleted.has(r.id))
  const allSelected = visible.length > 0 && visible.every(r => selected.has(r.id))

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(visible.map(r => r.id)))
    }
  }

  async function deleteSelected() {
    if (selected.size === 0) return
    setDeleting(true)
    try {
      const res = await fetch('/api/admin/music/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseIds: [...selected] }),
      })
      if (res.ok) {
        setDeleted(prev => new Set([...prev, ...selected]))
        setSelected(new Set())
      }
    } catch { /* ignore */ }
    setDeleting(false)
  }

  async function deleteOne(id: string) {
    try {
      const res = await fetch('/api/admin/music/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseId: id }),
      })
      if (res.ok) {
        setDeleted(prev => new Set([...prev, id]))
        setSelected(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    } catch { /* ignore */ }
  }

  return (
    <>
      {/* Bulk action bar */}
      <div className="flex items-center gap-3 mb-2">
        <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="accent-[var(--accent-primary)]"
          />
          Select all
        </label>
        {selected.size > 0 && (
          <button
            onClick={deleteSelected}
            disabled={deleting}
            className="px-3 py-1 text-xs font-semibold rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : `Delete ${selected.size} selected`}
          </button>
        )}
      </div>

      <div className="space-y-1">
        {visible.map(release => (
          <Card key={release.id}>
            <CardContent className="p-3 flex items-center gap-3">
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selected.has(release.id)}
                onChange={() => toggleOne(release.id)}
                className="accent-[var(--accent-primary)] shrink-0"
              />

              {/* Cover */}
              {release.coverUrl ? (
                <img
                  src={release.coverUrl}
                  alt={release.title}
                  className="w-12 h-12 rounded object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded bg-[var(--bg-elevated)] shrink-0" />
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {release.title}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  {release.artist}
                  {release.releaseDate && ` · ${new Date(release.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  {release.genre && ` · ${release.genre}`}
                  {release.releaseType && ` · ${release.releaseType}`}
                </p>
              </div>

              {/* Badges & actions */}
              <div className="flex items-center gap-2 shrink-0">
                {release.topArtist && (
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--accent-secondary)]">
                    Top Artist
                  </span>
                )}
                <span className="text-xs text-[var(--text-muted)]">
                  {release.ratingCount} ratings
                </span>
                <FeatureToggle releaseId={release.id} initialFeatured={release.featured} />
                <button
                  onClick={() => deleteOne(release.id)}
                  className="px-1.5 py-0.5 text-xs rounded text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors"
                  aria-label="Delete release"
                >
                  ×
                </button>
              </div>
            </CardContent>
          </Card>
        ))}

        {visible.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[var(--text-muted)]">No releases yet. Hit &quot;Fetch Music&quot; to pull from Spotify.</p>
          </div>
        )}
      </div>
    </>
  )
}
