'use client'

import { useEffect } from 'react'
import { initStatusBar } from '@/lib/native'

export function NativeInit() {
  useEffect(() => {
    initStatusBar()
  }, [])

  return null
}
