'use client'

import { useState, useEffect } from 'react'

export function AutopostToggle() {
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/autopost-toggle')
      .then(res => res.json())
      .then(data => setEnabled(data.enabled))
      .catch(() => setEnabled(true))
  }, [])

  async function toggle() {
    if (enabled === null) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/autopost-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled })
      })
      const data = await res.json()
      setEnabled(data.enabled)
    } catch {
      // revert on failure
    } finally {
      setLoading(false)
    }
  }

  if (enabled === null) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)]">
        <div className="w-8 h-[18px] rounded-full bg-[var(--bg-base)]" />
        <span className="text-xs text-[var(--text-muted)]">AI Autopost</span>
      </div>
    )
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-[var(--border-active)] transition-colors cursor-pointer disabled:opacity-50"
    >
      <div
        className="relative w-8 h-[18px] rounded-full transition-colors"
        style={{ backgroundColor: enabled ? 'var(--status-running)' : 'var(--text-muted)' }}
      >
        <div
          className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all"
          style={{ left: enabled ? '16px' : '2px' }}
        />
      </div>
      <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
        AI Autopost {enabled ? 'On' : 'Off'}
      </span>
    </button>
  )
}
