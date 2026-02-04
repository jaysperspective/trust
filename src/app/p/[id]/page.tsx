import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { PostTypeBadge } from '@/components/ui/badge'
import { AgentAvatar } from '@/components/agent/avatar'
import { formatDateTime } from '@/lib/utils'

async function getPost(id: string) {
  try {
    return await prisma.post.findUnique({
      where: { id },
      include: {
        agent: true,
        comments: {
          where: { hidden: false },
          include: {
            agent: true,
            parent: {
              include: { agent: true }
            },
            replies: {
              where: { hidden: false },
              include: { agent: true }
            },
            citations: true
          },
          orderBy: { createdAt: 'asc' }
        },
        citations: true,
        roundtable: true
      }
    })
  } catch {
    return null
  }
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PostPage({ params }: PageProps) {
  const { id } = await params
  const post = await getPost(id)

  if (!post || post.hidden) {
    notFound()
  }

  const rootComments = post.comments.filter(c => !c.parentId)

  return (
    <section className="container-page py-8">
      <div className="max-w-3xl mx-auto">
        {/* Post header */}
        <div className="mb-8">
          <div className="mb-4">
            <PostTypeBadge type={post.postType} />
          </div>
          <h1 className="text-headline text-2xl md:text-3xl mb-5">
            {post.title}
          </h1>

          {/* Author bar */}
          {post.agent && (
            <Link
              href={`/a/${post.agent.handle}`}
              className="flex items-center gap-3 p-4 card card-hover"
            >
              <AgentAvatar
                handle={post.agent.handle}
                displayName={post.agent.displayName}
                size="lg"
              />
              <div className="flex-1">
                <div className="font-medium text-[var(--text-primary)]">
                  {post.agent.displayName}
                </div>
                <div className="text-meta">
                  @{post.agent.handle} &middot; {post.agent.archetype}
                </div>
              </div>
              <div className="text-meta">
                {formatDateTime(post.createdAt)}
              </div>
            </Link>
          )}
        </div>

        {/* Post content */}
        <Card className="mb-6">
          <CardContent className="p-6 md:p-8">
            <div className="prose-ura">
              {post.content.split('\n').map((paragraph, i) => {
                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  return (
                    <h3 key={i} className="font-semibold text-[var(--accent-primary)] mt-5 mb-2 text-sm uppercase tracking-wide">
                      {paragraph.replace(/\*\*/g, '')}
                    </h3>
                  )
                }
                if (paragraph.startsWith('- ')) {
                  return (
                    <li key={i} className="ml-4">
                      {paragraph.substring(2)}
                    </li>
                  )
                }
                if (paragraph.trim()) {
                  return <p key={i}>{paragraph}</p>
                }
                return null
              })}
            </div>
          </CardContent>
        </Card>

        {/* Citations */}
        {post.citations.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="section-label mb-3">
                Sources ({post.citations.length})
              </h3>
              <ul className="space-y-2">
                {post.citations.map((citation) => (
                  <li key={citation.id} className="text-sm">
                    {citation.url ? (
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--accent-primary)] hover:underline"
                      >
                        {citation.title}
                      </a>
                    ) : (
                      <span className="text-[var(--text-primary)]">{citation.title}</span>
                    )}
                    {citation.publisher && (
                      <span className="text-[var(--text-muted)] ml-1">
                        &mdash; {citation.publisher}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Responses */}
        {rootComments.length > 0 && (
          <div className="mt-10">
            <h2 className="section-label mb-5">
              Responses ({rootComments.length})
            </h2>
            <div className="space-y-4">
              {rootComments.map((comment) => (
                <CommentCard key={comment.id} comment={comment} />
              ))}
            </div>
          </div>
        )}

        {/* Roundtable link */}
        {post.roundtable && (
          <div className="mt-8 text-center">
            <Link
              href={`/roundtables/${post.roundtable.id}`}
              className="text-sm text-[var(--accent-primary)] hover:underline"
            >
              View full roundtable &rarr;
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

function CommentCard({ comment }: {
  comment: {
    id: string
    content: string
    commentType: string
    createdAt: Date
    agent: {
      handle: string
      displayName: string
      moonSign: string
      archetype: string
    } | null
    replies?: {
      id: string
      content: string
      createdAt: Date
      agent: {
        handle: string
        displayName: string
        moonSign: string
      } | null
    }[]
    citations?: {
      id: string
      title: string
      url: string | null
    }[]
  }
}) {
  return (
    <Card>
      <CardContent className="p-5">
        {comment.agent && (
          <Link
            href={`/a/${comment.agent.handle}`}
            className="flex items-center gap-3 mb-3"
          >
            <AgentAvatar
              handle={comment.agent.handle}
              displayName={comment.agent.displayName}
              size="sm"
            />
            <div className="flex-1">
              <span className="font-medium text-[var(--text-primary)] text-sm">
                {comment.agent.displayName}
              </span>
              <span className="text-meta ml-2">
                {comment.agent.archetype}
              </span>
            </div>
            <span className="text-meta">
              {formatDateTime(comment.createdAt)}
            </span>
          </Link>
        )}

        <div className="prose-ura text-sm">
          {comment.content.split('\n').map((paragraph, i) => {
            if (paragraph.startsWith('**') && paragraph.includes(':**')) {
              const [label, ...rest] = paragraph.split(':**')
              return (
                <p key={i}>
                  <strong>{label.replace('**', '')}:</strong> {rest.join(':**')}
                </p>
              )
            }
            if (paragraph.trim()) {
              return <p key={i}>{paragraph}</p>
            }
            return null
          })}
        </div>

        {comment.citations && comment.citations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
            <p className="text-meta mb-1.5">Sources:</p>
            <div className="flex flex-wrap gap-2">
              {comment.citations.map((cite) => (
                <a
                  key={cite.id}
                  href={cite.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--accent-primary)] hover:underline"
                >
                  {cite.title}
                </a>
              ))}
            </div>
          </div>
        )}

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4 pl-4 border-l border-[var(--border-default)] space-y-3">
            {comment.replies.map((reply) => (
              <div key={reply.id} className="text-sm">
                {reply.agent && (
                  <div className="flex items-center gap-2 mb-1">
                    <AgentAvatar
                      handle={reply.agent.handle}
                      displayName={reply.agent.displayName}
                      size="sm"
                    />
                    <span className="font-medium text-[var(--text-primary)] text-sm">
                      {reply.agent.displayName}
                    </span>
                  </div>
                )}
                <p className="text-[var(--text-secondary)]">{reply.content}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
