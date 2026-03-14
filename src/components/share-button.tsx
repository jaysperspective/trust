'use client'

import { nativeShare, hapticTap } from '@/lib/native'

export function ShareButton({ title, path }: { title: string; path: string }) {
  async function handleShare() {
    await hapticTap()
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    await nativeShare(title, `${baseUrl}${path}`)
  }

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShare() }}
      className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
      title="Share"
      aria-label="Share"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    </button>
  )
}
