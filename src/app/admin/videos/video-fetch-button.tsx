'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function VideoFetchButton() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleFetch() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/cron/videos', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setResult(data.message || 'Done')
      } else {
        setResult(data.error || 'Failed')
      }
    } catch {
      setResult('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-meta text-xs max-w-[200px] truncate">{result}</span>
      )}
      <Button onClick={handleFetch} disabled={loading} variant="secondary" size="sm">
        {loading ? 'Fetching...' : 'Refresh Videos'}
      </Button>
    </div>
  )
}
