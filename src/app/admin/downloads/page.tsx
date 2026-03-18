import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isAdminAuthenticated } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from '@/lib/utils'

function parseOS(userAgent: string | null): string {
  if (!userAgent) return 'Other'
  if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) return 'macOS'
  if (userAgent.includes('Windows')) return 'Windows'
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS'
  if (userAgent.includes('Android')) return 'Android'
  if (userAgent.includes('Linux')) return 'Linux'
  return 'Other'
}

async function getDownloadAnalytics() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)
  const monthStart = new Date(todayStart)
  monthStart.setDate(monthStart.getDate() - 30)

  const [
    totalDownloads,
    downloadsToday,
    downloadsThisWeek,
    downloadsThisMonth,
    allEvents,
    recentDownloads,
  ] = await Promise.all([
    prisma.appDownloadEvent.count(),
    prisma.appDownloadEvent.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.appDownloadEvent.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.appDownloadEvent.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.appDownloadEvent.findMany({
      where: { createdAt: { gte: monthStart } },
      select: { createdAt: true, userAgent: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.appDownloadEvent.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
    }),
  ])

  // Build daily counts for last 30 days
  const dailyMap = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(todayStart)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    dailyMap.set(key, 0)
  }
  for (const event of allEvents) {
    const key = event.createdAt.toISOString().slice(0, 10)
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) || 0) + 1)
    }
  }
  const dailyCounts = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count }))
  const maxCount = Math.max(...dailyCounts.map(d => d.count), 1)

  // Build platform breakdown from all events in the last 30 days
  const platformCounts: Record<string, number> = {}
  for (const event of allEvents) {
    const os = parseOS(event.userAgent)
    platformCounts[os] = (platformCounts[os] || 0) + 1
  }
  const platforms = Object.entries(platformCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return {
    totalDownloads,
    downloadsToday,
    downloadsThisWeek,
    downloadsThisMonth,
    dailyCounts,
    maxCount,
    platforms,
    recentDownloads,
  }
}

export default async function DownloadAnalyticsPage() {
  const isAuthenticated = await isAdminAuthenticated()

  if (!isAuthenticated) {
    redirect('/admin/login')
  }

  const stats = await getDownloadAnalytics()

  return (
    <div className="container-page py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Download Analytics
          </h1>
          <Link href="/admin">
            <Button variant="secondary" size="sm">Back to Dashboard</Button>
          </Link>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Total', value: stats.totalDownloads, color: 'var(--accent-primary)' },
            { label: 'Today', value: stats.downloadsToday, color: 'var(--accent-secondary)' },
            { label: 'This Week', value: stats.downloadsThisWeek, color: 'var(--accent-muted)' },
            { label: 'This Month', value: stats.downloadsThisMonth, color: 'var(--status-running)' },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-semibold" style={{ color }}>
                  {value}
                </div>
                <div className="text-meta mt-1">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Daily Downloads Chart */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <h2 className="text-meta uppercase tracking-wider mb-4">Daily Downloads (Last 30 Days)</h2>
            <div className="flex items-end gap-1 h-40">
              {stats.dailyCounts.map((day, i) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${(day.count / stats.maxCount) * 100}%`,
                      background: 'var(--accent-primary)',
                      minHeight: day.count > 0 ? '2px' : '0',
                    }}
                    title={`${day.date}: ${day.count} downloads`}
                  />
                  {i % 5 === 0 && (
                    <span className="text-[9px] text-[var(--text-muted)] whitespace-nowrap">
                      {day.date.slice(5)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Platform Breakdown */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <h2 className="text-meta uppercase tracking-wider mb-4">Platform Breakdown (Last 30 Days)</h2>
            {stats.platforms.length > 0 ? (
              <div className="space-y-3">
                {stats.platforms.map((platform) => {
                  const pct = stats.downloadsThisMonth > 0
                    ? Math.round((platform.count / stats.downloadsThisMonth) * 100)
                    : 0
                  return (
                    <div key={platform.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {platform.name}
                        </span>
                        <span className="text-meta">
                          {platform.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            background: 'var(--accent-primary)',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-[var(--text-muted)] text-sm">No downloads in the last 30 days</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Downloads Table */}
        <Card>
          <CardContent className="p-5">
            <h2 className="text-meta uppercase tracking-wider mb-4">Recent Downloads</h2>
            {stats.recentDownloads.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-default)]">
                      <th className="text-left py-2 pr-4 text-meta font-medium">Time</th>
                      <th className="text-left py-2 pr-4 text-meta font-medium">Platform</th>
                      <th className="text-left py-2 text-meta font-medium">User Agent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentDownloads.map((event) => (
                      <tr
                        key={event.id}
                        className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-elevated)] transition-colors"
                      >
                        <td className="py-2 pr-4 text-meta whitespace-nowrap">
                          {formatRelativeTime(event.createdAt)}
                        </td>
                        <td className="py-2 pr-4 text-[var(--text-primary)] whitespace-nowrap">
                          {parseOS(event.userAgent)}
                        </td>
                        <td className="py-2 text-[var(--text-muted)] truncate max-w-xs">
                          {event.userAgent
                            ? event.userAgent.split(' ').slice(0, 5).join(' ')
                            : 'Unknown'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[var(--text-muted)] text-sm">No downloads yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
