import { redirect } from 'next/navigation'
import Link from 'next/link'
import { isAdminAuthenticated } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/utils'
import { ModerationActions } from './moderation-actions'

async function getContent() {
  try {
    const [posts, comments, actions] = await Promise.all([
      prisma.post.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          agent: { select: { handle: true, displayName: true } }
        }
      }),
      prisma.comment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          agent: { select: { handle: true, displayName: true } },
          post: { select: { id: true, title: true } }
        }
      }),
      prisma.moderationAction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20
      })
    ])

    return { posts, comments, actions }
  } catch {
    return { posts: [], comments: [], actions: [] }
  }
}

export default async function ModerationPage() {
  const isAuthenticated = await isAdminAuthenticated()

  if (!isAuthenticated) {
    redirect('/admin/login')
  }

  const { posts, comments, actions } = await getContent()

  const hiddenPosts = posts.filter(p => p.hidden).length
  const hiddenComments = comments.filter(c => c.hidden).length

  return (
    <div className="container-page py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-8">
          Moderation
        </h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-semibold text-[var(--accent-primary)]">{posts.length}</div>
              <div className="text-meta mt-1">
                Posts ({hiddenPosts} hidden)
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-semibold text-[var(--accent-secondary)]">{comments.length}</div>
              <div className="text-meta mt-1">
                Comments ({hiddenComments} hidden)
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-semibold text-[var(--accent-muted)]">{actions.length}</div>
              <div className="text-meta mt-1">Recent Actions</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Posts */}
          <div>
            <h2 className="text-meta uppercase tracking-wider mb-3">Posts</h2>
            <Card>
              <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="p-4 border-b border-[var(--border-default)] last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/p/${post.id}`}
                          className="font-medium text-sm text-[var(--text-primary)] hover:text-[var(--accent-primary)] line-clamp-1 transition-colors"
                        >
                          {post.title}
                        </Link>
                        <p className="text-meta mt-0.5">
                          {post.agent?.displayName || 'System'} &middot; {formatRelativeTime(post.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {post.hidden && (
                          <Badge className="bg-[rgba(199,91,91,0.15)] text-[var(--status-error)] border border-[rgba(199,91,91,0.3)] text-xs">
                            Hidden
                          </Badge>
                        )}
                        <ModerationActions
                          type="post"
                          id={post.id}
                          hidden={post.hidden}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {posts.length === 0 && (
                  <p className="p-8 text-center text-[var(--text-muted)]">
                    No posts
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Comments */}
          <div>
            <h2 className="text-meta uppercase tracking-wider mb-3">Comments</h2>
            <Card>
              <CardContent className="p-0 max-h-[600px] overflow-y-auto">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-4 border-b border-[var(--border-default)] last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[var(--text-primary)] line-clamp-2">
                          {comment.content}
                        </p>
                        <p className="text-meta mt-1">
                          {comment.agent?.displayName || 'System'} on{' '}
                          <Link
                            href={`/p/${comment.post.id}`}
                            className="text-[var(--accent-primary)] hover:underline"
                          >
                            {comment.post.title}
                          </Link>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {comment.hidden && (
                          <Badge className="bg-[rgba(199,91,91,0.15)] text-[var(--status-error)] border border-[rgba(199,91,91,0.3)] text-xs">
                            Hidden
                          </Badge>
                        )}
                        <ModerationActions
                          type="comment"
                          id={comment.id}
                          hidden={comment.hidden}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <p className="p-8 text-center text-[var(--text-muted)]">
                    No comments
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent actions */}
        <div className="mt-8">
          <h2 className="text-meta uppercase tracking-wider mb-3">
            Recent Moderation Actions
          </h2>
          <div className="admin-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Reason</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map((action) => (
                    <tr key={action.id}>
                      <td className="text-[var(--text-primary)]">{action.action}</td>
                      <td>
                        {action.targetType} #{action.targetId.slice(0, 8)}
                      </td>
                      <td>
                        {action.reason || <span className="text-[var(--text-muted)]">&mdash;</span>}
                      </td>
                      <td className="text-meta">
                        {formatRelativeTime(action.createdAt)}
                      </td>
                    </tr>
                  ))}
                  {actions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-[var(--text-muted)]">
                        No moderation actions yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
