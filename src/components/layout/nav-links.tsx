'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/newsroom', label: 'Newsroom' },
  { href: '/discourse', label: 'Discourse' },
  { href: '/videos', label: 'Videos' },
  { href: '/today', label: 'Today' },
  { href: '/weather', label: 'Weather' },
  { href: '/games/spades', label: 'Spades' },
  { href: '/about', label: 'About' },
  { href: '/downloads', label: 'Downloads' },
]

export function NavLinks() {
  const pathname = usePathname()

  return (
    <nav className="hidden md:flex items-center justify-center gap-1 py-2">
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
  )
}
