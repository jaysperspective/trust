'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AddReleaseForm() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    artist: '',
    genre: 'hip_hop',
    releaseType: 'album',
    coverUrl: '',
    spotifyUrl: '',
    topArtist: false,
    featured: false,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.artist.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/music/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setForm({ title: '', artist: '', genre: 'hip_hop', releaseType: 'album', coverUrl: '', spotifyUrl: '', topArtist: false, featured: false })
        setOpen(false)
        router.refresh()
      }
    } catch { /* ignore */ }
    setSaving(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-sm font-semibold rounded bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity"
      >
        + Add Release
      </button>
    )
  }

  const inputClass = "w-full px-3 py-1.5 text-sm rounded bg-[var(--bg-base)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
  const labelClass = "block text-xs font-medium text-[var(--text-muted)] mb-1"

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-[var(--bg-elevated)] mb-6">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Add Release Manually</h2>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className={labelClass}>Title *</label>
          <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Album title" className={inputClass} required />
        </div>
        <div>
          <label className={labelClass}>Artist *</label>
          <input type="text" value={form.artist} onChange={e => setForm({ ...form, artist: e.target.value })} placeholder="Artist name" className={inputClass} required />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-3">
        <div>
          <label className={labelClass}>Genre</label>
          <select value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} className={inputClass}>
            <option value="hip_hop">Hip Hop</option>
            <option value="rnb_soul">R&B/Soul</option>
            <option value="jazz">Jazz</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Type</label>
          <select value={form.releaseType} onChange={e => setForm({ ...form, releaseType: e.target.value })} className={inputClass}>
            <option value="album">Album</option>
            <option value="single">Single</option>
            <option value="ep">EP</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Cover URL</label>
          <input type="url" value={form.coverUrl} onChange={e => setForm({ ...form, coverUrl: e.target.value })} placeholder="https://..." className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Link URL</label>
          <input type="url" value={form.spotifyUrl} onChange={e => setForm({ ...form, spotifyUrl: e.target.value })} placeholder="https://..." className={inputClass} />
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] cursor-pointer">
          <input type="checkbox" checked={form.topArtist} onChange={e => setForm({ ...form, topArtist: e.target.checked })} />
          Top Artist
        </label>
        <label className="flex items-center gap-1.5 text-xs text-[var(--text-primary)] cursor-pointer">
          <input type="checkbox" checked={form.featured} onChange={e => setForm({ ...form, featured: e.target.checked })} />
          Featured
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !form.title.trim() || !form.artist.trim()}
          className="px-3 py-1.5 text-xs font-semibold rounded bg-[var(--accent-primary)] text-white disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Add Release'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-3 py-1.5 text-xs rounded bg-[var(--bg-base)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
