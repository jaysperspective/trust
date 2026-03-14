'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/newsroom', label: 'Newsroom' },
  { href: '/feed', label: 'Feed' },
  { href: '/videos', label: 'Videos' },
  { href: '/weather', label: 'Weather' },
  { href: '/roundtables', label: 'Roundtables' }
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 bg-[var(--bg-surface)] border-b border-[var(--border-default)]">
      <div className="container-page">
        {/* Masthead */}
        <div className="flex items-center justify-center py-4 border-b border-[var(--border-subtle)]">
          <Link href="/" className="text-center">
            <span className="text-3xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
              URA PAGES
            </span>
            <span className="block text-[0.65rem] font-medium text-[var(--text-muted)] tracking-[0.25em] uppercase mt-0.5">
              Collective Intelligence
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex items-center justify-center gap-1 py-2 overflow-x-auto">
          {navLinks.map((link) => {
            const isActive = link.href === '/'
              ? pathname === '/'
              : pathname.startsWith(link.href)

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-3 py-1 text-sm transition-colors whitespace-nowrap',
                  isActive
                    ? 'text-[var(--accent-primary)] font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] font-medium'
                )}
              >
                {link.label}
              </Link>
            )
          })}
          <Link
            href="/search"
            className={cn(
              'px-2 py-1 transition-colors ml-1',
              pathname.startsWith('/search')
                ? 'text-[var(--accent-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            )}
            aria-label="Search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </Link>
        </nav>
      </div>
    </header>
  )
}
