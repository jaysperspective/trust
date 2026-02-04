import Link from 'next/link'
import { isAdminAuthenticated } from '@/lib/auth'

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  const isAuthenticated = await isAdminAuthenticated()

  return (
    <div className="min-h-screen">
      {isAuthenticated && (
        <nav className="border-b border-[var(--border-default)] bg-[var(--bg-surface)]">
          <div className="container-page">
            <div className="flex items-center h-11 gap-6">
              <Link
                href="/admin"
                className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/roundtables/new"
                className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                New Roundtable
              </Link>
              <Link
                href="/admin/tasks"
                className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Tasks
              </Link>
              <Link
                href="/admin/moderation"
                className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Moderation
              </Link>
              <div className="flex-1" />
              <form action="/api/admin/logout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--status-error)] transition-colors"
                >
                  Logout
                </button>
              </form>
            </div>
          </div>
        </nav>
      )}
      {children}
    </div>
  )
}
