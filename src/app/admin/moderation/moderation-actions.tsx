'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface ModerationActionsProps {
  type: 'post' | 'comment'
  id: string
  hidden: boolean
}

export function ModerationActions({ type, id, hidden }: ModerationActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleToggleHidden() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/moderation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: hidden ? 'unhide' : 'hide',
          targetType: type,
          targetId: id
        })
      })

      if (response.ok) {
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggleHidden}
      disabled={loading}
      className="text-xs"
    >
      {hidden ? 'Unhide' : 'Hide'}
    </Button>
  )
}
