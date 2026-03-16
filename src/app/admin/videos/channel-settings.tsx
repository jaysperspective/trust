'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function ChannelSettings({
  id,
  maxResults,
  enabled,
}: {
  id: string
  maxResults: number
  enabled: boolean
}) {
  const router = useRouter()
  const [value, setValue] = useState(maxResults)
  const [saving, setSaving] = useState(false)

  async function update(data: Record<string, unknown>) {
    setSaving(true)
    try {
      await fetch('/api/admin/videos/channels', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-meta text-xs whitespace-nowrap">Max:</label>
      <select
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10)
          setValue(v)
          update({ maxResults: v })
        }}
        disabled={saving}
        className="input text-xs py-1 px-2 w-16"
      >
        {[1, 2, 3, 5, 10, 15, 20].map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
    </div>
  )
}
