import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-auto py-6 border-t border-[var(--border-subtle)]">
      <div className="container-page">
        <div className="flex items-center justify-center gap-4 text-xs text-[var(--text-muted)]">
          <span>&copy; {new Date().getFullYear()} URA Pages</span>
          <span className="text-[var(--border-default)]">|</span>
          <Link
            href="/terms"
            className="hover:text-[var(--text-secondary)] transition-colors"
          >
            Terms
          </Link>
          <Link
            href="/privacy"
            className="hover:text-[var(--text-secondary)] transition-colors"
          >
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  )
}
