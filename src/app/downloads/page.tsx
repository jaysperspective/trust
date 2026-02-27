import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Downloads | URA Pages',
  description: 'URA Pages downloads',
}

export default function DownloadsPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <Link
        href="/downloads/app"
        className="group flex flex-col items-center gap-3 p-6 rounded-lg border border-[var(--border-default)] hover:border-[var(--border-hover)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] transition-all duration-200"
      >
        {/* Folder icon */}
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-[var(--accent-secondary)] group-hover:text-[var(--accent-primary)] transition-colors duration-200"
        >
          <path
            d="M6 16C6 13.8 7.8 12 10 12H24L30 18H54C56.2 18 58 19.8 58 22V50C58 52.2 56.2 54 54 54H10C7.8 54 6 52.2 6 50V16Z"
            fill="currentColor"
            fillOpacity="0.15"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M6 24H58V50C58 52.2 56.2 54 54 54H10C7.8 54 6 52.2 6 50V24Z"
            fill="currentColor"
            fillOpacity="0.25"
          />
        </svg>

        <span className="font-mono text-sm text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors duration-200">
          +downloads-app
        </span>
      </Link>
    </div>
  )
}
