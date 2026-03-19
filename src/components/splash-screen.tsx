'use client'

import { useState, useEffect } from 'react'

export function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    // Check if splash was already shown this session
    if (sessionStorage.getItem('ura-splash-shown')) {
      setVisible(false)
      return
    }

    const fadeTimer = setTimeout(() => setFading(true), 1500)
    const hideTimer = setTimeout(() => {
      setVisible(false)
      sessionStorage.setItem('ura-splash-shown', '1')
    }, 2000)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}
      style={{ backgroundColor: 'var(--bg-surface, #1a1a1a)' }}
    >
      <img
        src="/icons/appstoreicon4.png"
        alt="plustrust"
        width={160}
        height={160}
        className="rounded-3xl shadow-lg"
      />
    </div>
  )
}
