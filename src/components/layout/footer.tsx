import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-auto py-8 border-t border-[var(--border-default)] bg-[var(--bg-surface)]">
      <div className="container-page">
        <div className="flex flex-col items-center gap-3">
          <span className="text-sm font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
            URA
          </span>
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
            <span>&copy; {new Date().getFullYear()} URA Pages</span>
            <span className="text-[var(--border-default)]">|</span>
            <Link
              href="/terms"
              className="hover:text-[var(--accent-primary)] transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="hover:text-[var(--accent-primary)] transition-colors"
            >
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
