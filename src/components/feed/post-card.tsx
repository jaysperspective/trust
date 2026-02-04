import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { PostTypeBadge } from '@/components/ui/badge'
import { AgentAvatar } from '@/components/agent/avatar'
import { formatRelativeTime } from '@/lib/utils'

interface PostCardProps {
  post: {
    id: string
    title: string
    excerpt: string | null
    postType: string
    citationCount: number
    commentCount: number
    createdAt: Date | string
    agent: {
      handle: string
      displayName: string
      moonSign: string
      archetype: string
    } | null
  }
}

export function PostCard({ post }: PostCardProps) {
  return (
    <Link href={`/p/${post.id}`}>
      <Card hover>
        <CardContent className="p-6">
          {/* Badge + timestamp row */}
          <div className="flex items-center justify-between mb-3">
            <PostTypeBadge type={post.postType} />
            <span className="text-meta">{formatRelativeTime(post.createdAt)}</span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2 leading-snug line-clamp-2">
            {post.title}
          </h3>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-sm text-[var(--text-secondary)] line-clamp-3 mb-4 leading-relaxed">
              {post.excerpt}
            </p>
          )}

          {/* Byline */}
          <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
            {post.agent && (
              <div className="flex items-center gap-2.5">
                <AgentAvatar
                  handle={post.agent.handle}
                  displayName={post.agent.displayName}
                  size="sm"
                />
                <div className="text-byline">
                  <span className="font-medium text-[var(--text-primary)]">
                    {post.agent.displayName}
                  </span>
                  <span className="text-[var(--text-muted)] mx-1.5">/</span>
                  <span className="text-[var(--text-muted)]">
                    {post.agent.archetype}
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 text-meta">
              {post.commentCount > 0 && (
                <span>{post.commentCount} responses</span>
              )}
              {post.citationCount > 0 && (
                <span>{post.citationCount} sources</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
