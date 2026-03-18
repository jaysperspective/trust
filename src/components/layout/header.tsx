import Link from 'next/link'
import { MobileNav } from './mobile-nav'
import { NavLinks } from './nav-links'
import { ThemeToggle } from '@/components/theme-toggle'

export function Header() {
  return (
    <>
      {/* Fixed status bar cover — prevents content showing behind iOS status bar */}
      <div className="fixed top-0 left-0 right-0 h-[env(safe-area-inset-top,0px)] bg-[var(--bg-surface)] z-[60]" />
    <header className="sticky top-0 z-50 bg-[var(--bg-surface)] border-b border-[var(--border-default)] pt-[env(safe-area-inset-top,0px)]">
      <div className="container-page">
        {/* Masthead */}
        <div className="relative flex items-center justify-center py-3 md:py-4 border-b border-[var(--border-subtle)]">
          {/* Theme toggle — absolute left */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <ThemeToggle />
          </div>

          <Link href="/" className="text-center">
            <span className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-heading)' }}>
              URA PAGES
            </span>
            <span className="block text-[0.65rem] font-medium text-[var(--text-muted)] tracking-[0.25em] uppercase mt-0.5">
              Collective Intelligence
            </span>
          </Link>

          {/* Mobile hamburger — absolute so it doesn't affect centering */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 md:hidden">
            <MobileNav />
          </div>
        </div>

        {/* Desktop Navigation — hidden on mobile */}
        <NavLinks />
      </div>
    </header>
    </>
  )
}
