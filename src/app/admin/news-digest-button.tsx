'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function NewsDigestButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/cron/news-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const data = await res.json()

      if (data.success) {
        setResult(`${data.stored} stories fetched`)
        router.refresh()
      } else {
        setResult(data.error || 'Failed')
      }
    } catch {
      setResult('Failed to fetch news')
    } finally {
      setLoading(false)
      setTimeout(() => setResult(null), 4000)
    }
  }

  return (
    <div className="relative">
      <Button variant="secondary" onClick={handleClick} loading={loading}>
        Refresh News
      </Button>
      {result && (
        <div className="absolute top-full right-0 mt-2 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)] whitespace-nowrap">
          {result}
        </div>
      )}
    </div>
  )
}
