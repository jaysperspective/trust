'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ONE_HOUR_MS = 60 * 60 * 1000

export default function NewsroomAutoRefresh() {
  const router = useRouter()

  useEffect(() => {
    const id = setInterval(() => {
      router.refresh()
    }, ONE_HOUR_MS)

    return () => clearInterval(id)
  }, [router])

  return null
}
