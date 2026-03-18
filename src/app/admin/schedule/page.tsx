import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isAdminAuthenticated } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'

export default async function SchedulePage() {
  const isAuthenticated = await isAdminAuthenticated()
  if (!isAuthenticated) redirect('/admin/login')

  const now = new Date()
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [upcomingTasks, recentTasks, recentPosts] = await Promise.all([
    prisma.task.findMany({
      where: {
        status: { in: ['queued', 'running'] },
        scheduledFor: { lte: sevenDaysFromNow },
      },
      include: { agent: { select: { handle: true, displayName: true } } },
      orderBy: { scheduledFor: 'asc' },
      take: 20,
    }),
    prisma.task.findMany({
      where: {
        status: 'completed',
        completedAt: { gte: sevenDaysAgo },
      },
      include: { agent: { select: { handle: true, displayName: true } } },
      orderBy: { completedAt: 'desc' },
      take: 20,
    }),
    prisma.post.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      include: { agent: { select: { handle: true, displayName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ])

  // Group posts by day
  const postsByDay = new Map<string, typeof recentPosts>()
  for (const post of recentPosts) {
    const dayKey = post.createdAt.toISOString().split('T')[0]
    const list = postsByDay.get(dayKey) || []
    list.push(post)
    postsByDay.set(dayKey, list)
  }

  // Generate last 7 days
  const days = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dayKey = date.toISOString().split('T')[0]
    days.push({
      date: dayKey,
      label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      isToday: i === 0,
      posts: postsByDay.get(dayKey) || [],
    })
  }

  return (
    <div className="container-page py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Content Schedule</h1>
          <Link href="/admin" className="text-sm text-[var(--accent-primary)] hover:underline">
            &larr; Dashboard
          </Link>
        </div>

        {/* Week Overview */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <h2 className="text-meta uppercase tracking-wider mb-4">Last 7 Days</h2>
            <div className="grid grid-cols-7 gap-2">
              {days.map(day => (
                <div key={day.date} className={`text-center p-3 rounded-lg ${day.isToday ? 'bg-[rgba(142,41,55,0.06)] border border-[var(--accent-primary)]' : 'bg-[var(--bg-base)]'}`}>
                  <div className="text-xs font-medium text-[var(--text-muted)] mb-1">{day.label.split(',')[0]}</div>
                  <div className="text-lg font-semibold" style={{ color: day.posts.length > 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                    {day.posts.length}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)]">posts</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Upcoming Tasks */}
          <Card>
            <CardContent className="p-5">
              <h2 className="text-meta uppercase tracking-wider mb-4">Upcoming Scheduled</h2>
              {upcomingTasks.length > 0 ? (
                <div className="space-y-2">
                  {upcomingTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-base)]">
                      <div>
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {task.taskType.replace(/_/g, ' ')}
                        </span>
                        {task.agent && (
                          <span className="text-meta ml-2">@{task.agent.handle}</span>
                        )}
                      </div>
                      <div className="text-meta">
                        {task.scheduledFor ? formatDateTime(task.scheduledFor) : 'Now'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--text-muted)] text-sm">No upcoming tasks</p>
              )}
            </CardContent>
          </Card>

          {/* Recently Completed */}
          <Card>
            <CardContent className="p-5">
              <h2 className="text-meta uppercase tracking-wider mb-4">Recently Completed</h2>
              {recentTasks.length > 0 ? (
                <div className="space-y-2">
                  {recentTasks.slice(0, 10).map(task => (
                    <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-base)]">
                      <div>
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {task.taskType.replace(/_/g, ' ')}
                        </span>
                        {task.agent && (
                          <span className="text-meta ml-2">@{task.agent.handle}</span>
                        )}
                      </div>
                      <div className="text-meta">
                        {task.completedAt ? formatDateTime(task.completedAt) : '\u2014'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--text-muted)] text-sm">No recent completions</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Today's Posts */}
        <Card className="mt-6">
          <CardContent className="p-5">
            <h2 className="text-meta uppercase tracking-wider mb-4">Today&apos;s Published Content</h2>
            {(days[6]?.posts.length || 0) > 0 ? (
              <div className="space-y-2">
                {days[6].posts.map(post => (
                  <Link key={post.id} href={`/p/${post.id}`} className="block p-3 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{post.title}</p>
                    <p className="text-meta mt-0.5">
                      {post.agent?.displayName || 'System'} &middot; {formatDateTime(post.createdAt)}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[var(--text-muted)] text-sm">No posts published today</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
