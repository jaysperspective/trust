'use client'

import { useEffect, useRef, useState } from 'react'

interface InstagramPost {
  url: string
  thumbnailUrl: string
  caption: string
}

export function InstagramFeed({ username }: { username: string }) {
  const [loaded, setLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load Instagram embed script
    const existing = document.querySelector('script[src*="instagram.com/embed.js"]')
    if (!existing) {
      const script = document.createElement('script')
      script.src = 'https://www.instagram.com/embed.js'
      script.async = true
      script.onload = () => {
        setLoaded(true)
        // @ts-expect-error Instagram global
        window.instgrm?.Embeds?.process()
      }
      document.body.appendChild(script)
    } else {
      setLoaded(true)
      // @ts-expect-error Instagram global
      window.instgrm?.Embeds?.process()
    }
  }, [])

  useEffect(() => {
    if (loaded) {
      // @ts-expect-error Instagram global
      window.instgrm?.Embeds?.process()
    }
  }, [loaded])

  return (
    <div ref={containerRef}>
      {/* Profile embed linking to the Instagram page */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <a
            href={`https://www.instagram.com/${username}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center">
              <div className="w-9 h-9 rounded-full bg-[var(--bg-surface)] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-primary)]">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="m16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </div>
            </div>
            <div>
              <span className="font-semibold text-[var(--text-primary)] text-sm">@{username}</span>
              <p className="text-xs text-[var(--text-muted)]">Follow on Instagram</p>
            </div>
            <svg className="ml-auto text-[var(--text-muted)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </div>

        {/* Embedded Instagram profile posts */}
        <div className="sm:col-span-2">
          <blockquote
            className="instagram-media"
            data-instgrm-permalink={`https://www.instagram.com/${username}/`}
            data-instgrm-version="14"
            style={{
              background: 'var(--bg-surface)',
              border: '0',
              borderRadius: '12px',
              margin: '0',
              maxWidth: '100%',
              minWidth: '100%',
              padding: '0',
              width: '100%',
            }}
          />
        </div>
      </div>

      {!loaded && (
        <div className="grid grid-cols-3 gap-1 mt-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-square bg-[var(--bg-elevated)] rounded animate-pulse" />
          ))}
        </div>
      )}
    </div>
  )
}
