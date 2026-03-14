'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/newsroom', label: 'Newsroom' },
  { href: '/feed', label: 'Feed' },
  { href: '/videos', label: 'Videos' },
  { href: '/today', label: 'Today' },
  { href: '/weather', label: 'Weather' },
  { href: '/roundtables', label: 'Roundtables' },
  { href: '/topics', label: 'Topics' },
  { href: '/corrections', label: 'Corrections' },
  { href: '/about', label: 'About' },
  { href: '/downloads', label: 'Downloads' },
  { href: '/search', label: 'Search' },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="md:hidden p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/30 md:hidden"
            style={{ zIndex: 9998 }}
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <div
            className="fixed top-0 right-0 h-full w-72 bg-[var(--bg-surface)] border-l border-[var(--border-default)] shadow-lg md:hidden overflow-y-auto"
            style={{ zIndex: 9999 }}
          >
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
              <span className="text-lg font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
                Menu
              </span>
              <button
                onClick={() => setOpen(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="p-4">
              <ul className="space-y-1">
                {navLinks.map((link) => {
                  const isActive = pathname.startsWith(link.href)
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={cn(
                          'block px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-[var(--bg-elevated)] text-[var(--accent-primary)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                        )}
                      >
                        {link.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </div>
        </>
      )}
    </>
  )
}
