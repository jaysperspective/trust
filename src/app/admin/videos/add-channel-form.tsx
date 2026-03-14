'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function AddChannelForm() {
  const router = useRouter()
  const [channelId, setChannelId] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!channelId.trim() || !name.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/videos/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: channelId.trim(),
          name: name.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setChannelId('')
        setName('')
        router.refresh()
      } else {
        setError(data.error || 'Failed to add channel')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          placeholder="YouTube Channel ID (e.g. UCxxxxxxx)"
          className="input"
          required
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Channel name"
          className="input"
          required
        />
      </div>
      {error && (
        <p className="text-sm text-[var(--status-error)]">{error}</p>
      )}
      <Button type="submit" disabled={loading} size="sm">
        {loading ? 'Adding...' : 'Add Channel'}
      </Button>
    </form>
  )
}
