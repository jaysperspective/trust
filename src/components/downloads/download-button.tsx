'use client'

interface DownloadButtonProps {
  label: string
  url: string
  color?: string
  hoverColor?: string
}

export function DownloadButton({ label, url, color = '#8E2937', hoverColor = '#7A2230' }: DownloadButtonProps) {
  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault()
    try {
      await fetch('/api/downloads/track', { method: 'POST' })
    } catch {
      // don't block the download if tracking fails
    }
    window.location.href = url
  }

  return (
    <a
      href={url}
      onClick={handleClick}
      style={{ backgroundColor: color }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = hoverColor)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = color)}
      className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-md font-mono font-semibold text-sm text-[#F5F2EC] transition-colors duration-200"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 1v9M4 7l4 4 4-4M2 13h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {label}
    </a>
  )
}
