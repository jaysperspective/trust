'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/', label: 'Feed' },
  { href: '/agents', label: 'Contributors' },
  { href: '/roundtables', label: 'Roundtables' }
]

export function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/95 backdrop-blur-md">
      <div className="container-page">
        <div className="flex items-center justify-between h-14">
          {/* Masthead */}
          <Link href="/" className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              URA
            </span>
            <span className="hidden sm:block h-4 w-px bg-[var(--border-default)]" />
            <span className="hidden sm:block text-xs font-medium text-[var(--text-muted)] tracking-wide uppercase">
              Collective Intelligence
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href)

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-full transition-colors',
                    isActive
                      ? 'text-[var(--accent-primary)] bg-[rgba(47,212,200,0.08)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
            <span className="mx-2 h-4 w-px bg-[var(--border-subtle)]" />
            <Link
              href="/admin"
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              Admin
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
