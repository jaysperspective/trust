'use client'

const DRIVE_URL = 'https://drive.google.com/uc?export=download&id=1AWviP-BEVDj4sih1GlWjVUAj5ddE1E75'

export function DownloadButton({ label }: { label: string }) {
  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    try {
      await fetch('/api/downloads/track', { method: 'POST' })
    } catch {
      // don't block the download if tracking fails
    }
    window.location.href = DRIVE_URL
  }

  return (
    <a
      href={DRIVE_URL}
      onClick={handleClick}
      className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-lg font-mono font-semibold text-sm text-white bg-[#e05cb8] hover:bg-[#c94ea0] transition-colors duration-200"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 1v9M4 7l4 4 4-4M2 13h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {label}
    </a>
  )
}
