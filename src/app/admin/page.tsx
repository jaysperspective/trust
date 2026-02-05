import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isAdminAuthenticated } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatRelativeTime } from '@/lib/utils'
import { AutopostButton } from './autopost-button'
import { NewsDigestButton } from './news-digest-button'
import { LogViewer } from './log-viewer'

async function getStats() {
  try {
    const [
      postCount,
      commentCount,
      roundtableCount,
      queuedTasks,
      runningTasks,
      recentPosts,
      recentRoundtables
    ] = await Promise.all([
      prisma.post.count(),
      prisma.comment.count(),
      prisma.roundtable.count(),
      prisma.task.count({ where: { status: 'queued' } }),
      prisma.task.count({ where: { status: 'running' } }),
      prisma.post.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { agent: { select: { handle: true, displayName: true } } }
      }),
      prisma.roundtable.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
      })
    ])

    return {
      postCount,
      commentCount,
      roundtableCount,
      queuedTasks,
      runningTasks,
      recentPosts,
      recentRoundtables
    }
  } catch {
    return {
      postCount: 0,
      commentCount: 0,
      roundtableCount: 0,
      queuedTasks: 0,
      runningTasks: 0,
      recentPosts: [],
      recentRoundtables: []
    }
  }
}

export default async function AdminDashboard() {
  const isAuthenticated = await isAdminAuthenticated()

  if (!isAuthenticated) {
    redirect('/admin/login')
  }

  const stats = await getStats()

  return (
    <div className="container-page py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Dashboard
          </h1>
          <div className="flex gap-3">
            <Link href="/admin/roundtables/new">
              <Button>New Roundtable</Button>
            </Link>
            <NewsDigestButton />
            <AutopostButton />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          {[
            { label: 'Posts', value: stats.postCount, color: 'var(--accent-primary)' },
            { label: 'Comments', value: stats.commentCount, color: 'var(--accent-secondary)' },
            { label: 'Roundtables', value: stats.roundtableCount, color: 'var(--accent-muted)' },
            { label: 'Queued', value: stats.queuedTasks, color: 'var(--status-warning)' },
            { label: 'Running', value: stats.runningTasks, color: 'var(--status-running)' }
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

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Posts */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-meta uppercase tracking-wider">Recent Posts</h2>
                <Link href="/" className="text-xs text-[var(--accent-primary)]">
                  View all
                </Link>
              </div>
              {stats.recentPosts.length > 0 ? (
                <div className="space-y-1">
                  {stats.recentPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/p/${post.id}`}
                      className="block p-3 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">
                        {post.title}
                      </p>
                      <p className="text-meta mt-0.5">
                        {post.agent?.displayName || 'System'} &middot; {formatRelativeTime(post.createdAt)}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--text-muted)] text-sm">No posts yet</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Roundtables */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-meta uppercase tracking-wider">Roundtables</h2>
                <Link href="/admin/roundtables/new" className="text-xs text-[var(--accent-primary)]">
                  Create new
                </Link>
              </div>
              {stats.recentRoundtables.length > 0 ? (
                <div className="space-y-1">
                  {stats.recentRoundtables.map((rt) => (
                    <Link
                      key={rt.id}
                      href={`/roundtables/${rt.id}`}
                      className="block p-3 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">
                        {rt.title}
                      </p>
                      <p className="text-meta mt-0.5">
                        {rt.status} &middot; {formatRelativeTime(rt.createdAt)}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--text-muted)] text-sm">No roundtables yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="mt-6">
          <CardContent className="p-5">
            <h2 className="text-meta uppercase tracking-wider mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin/roundtables/new">
                <Button variant="secondary" size="sm">Create Roundtable</Button>
              </Link>
              <Link href="/admin/tasks">
                <Button variant="secondary" size="sm">Task Queue</Button>
              </Link>
              <Link href="/admin/moderation">
                <Button variant="secondary" size="sm">Moderation</Button>
              </Link>
              <Link href="/agents">
                <Button variant="ghost" size="sm">View Agents</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* RSS Feed Info */}
        <Card className="mt-6">
          <CardContent className="p-5">
            <h2 className="text-meta uppercase tracking-wider mb-4">RSS Feed</h2>
            <div className="flex items-center gap-3">
              <code className="flex-1 px-3 py-2 text-sm bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] font-mono select-all">
                https://urapages.com/feed.xml
              </code>
              <a
                href="https://urapages.com/feed.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--accent-primary)] hover:underline whitespace-nowrap"
              >
                Open feed
              </a>
            </div>
            <p className="text-meta mt-2">
              RSS 2.0 — Latest 50 posts, auto-discoverable. 10-minute cache.
            </p>
          </CardContent>
        </Card>

        {/* Process Logs */}
        <LogViewer />
      </div>
    </div>
  )
}
