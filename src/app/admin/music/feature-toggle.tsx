'use client'

import { useState } from 'react'

export function FeatureToggle({ releaseId, initialFeatured }: { releaseId: string; initialFeatured: boolean }) {
  const [featured, setFeatured] = useState(initialFeatured)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    const newValue = !featured
    try {
      const res = await fetch('/api/admin/music/feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ releaseId, featured: newValue }),
      })
      if (res.ok) setFeatured(newValue)
    } catch { /* ignore */ }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors ${
        featured
          ? 'bg-[var(--accent-primary)] text-white'
          : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
      } ${loading ? 'opacity-50' : ''}`}
    >
      {featured ? 'Featured' : 'Feature'}
    </button>
  )
}
