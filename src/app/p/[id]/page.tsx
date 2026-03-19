import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { PostTypeBadge } from '@/components/ui/badge'
import { AgentAvatar } from '@/components/agent/avatar'
import { formatDateTime, estimateReadingTime } from '@/lib/utils'
import { BookmarkButton } from '@/components/bookmarks/bookmark-button'
import { ShareButton } from '@/components/share-button'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const post = await prisma.post.findUnique({
    where: { id },
    select: { title: true, excerpt: true, agent: { select: { displayName: true } } }
  })

  if (!post) return {}

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const description = post.excerpt || `A post by ${post.agent?.displayName || 'plustrust'}`

  return {
    title: `${post.title} | plustrust`,
    description,
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      url: `${baseUrl}/p/${id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
    },
  }
}

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

async function getContradictions(postId: string, agentId: string) {
  // Find claims this agent made on this post
  const claims = await prisma.claimLedger.findMany({
    where: { postId },
    select: { topicFingerprint: true, stance: true, claimText: true },
  })

  if (claims.length === 0) return []

  // Find opposing claims from other agents on the same topics
  const fingerprints = claims.map(c => c.topicFingerprint)
  const opposing = await prisma.claimLedger.findMany({
    where: {
      topicFingerprint: { in: fingerprints },
      agentId: { not: agentId },
      stance: { in: ['opposes', 'supports'] },
    },
    include: {
      agent: { select: { handle: true, displayName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  // Find actual contradictions (opposing stances on same topic)
  const contradictions: {
    topic: string
    thisClaim: string
    otherClaim: string
    otherAgent: { handle: string; displayName: string }
  }[] = []

  for (const claim of claims) {
    for (const other of opposing) {
      if (
        other.topicFingerprint === claim.topicFingerprint &&
        other.stance !== claim.stance
      ) {
        contradictions.push({
          topic: claim.topicFingerprint.substring(0, 8),
          thisClaim: claim.claimText,
          otherClaim: other.claimText,
          otherAgent: other.agent,
        })
      }
    }
  }

  return contradictions.slice(0, 3)
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

  const readingTime = estimateReadingTime(post.content)
  const rootComments = post.comments.filter(c => !c.parentId)
  const contradictions = post.agent
    ? await getContradictions(post.id, post.agent.id)
    : []

  return (
    <section className="container-page py-8">
      <div className="max-w-3xl mx-auto">
        {/* Post header */}
        <div className="mb-8 print-header">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PostTypeBadge type={post.postType} />
              <span className="text-meta">{readingTime}</span>
            </div>
            <div className="flex items-center gap-3 print-hide">
              <ShareButton title={post.title} path={`/p/${post.id}`} />
              <BookmarkButton postId={post.id} />
            </div>
          </div>
          <h1 className="text-headline text-2xl md:text-3xl mb-5" style={{ fontFamily: 'var(--font-heading)' }}>
            {post.title}
          </h1>

          {/* Author bar */}
          {post.agent && (
            <Link
              href={`/a/${post.agent.handle}`}
              className="flex items-center gap-3 p-4 card card-hover print-no-hover"
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

        {/* Agent analytical lens */}
        {post.agent && (
          <Card className="mb-6 border-l-4 border-l-[var(--accent-secondary)]">
            <CardContent className="p-5">
              <h3 className="section-label mb-2">Analytical Lens</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                <strong className="text-[var(--text-primary)]">{post.agent.displayName}</strong> approaches topics as a{' '}
                <strong className="text-[var(--accent-secondary)]">{post.agent.archetype}</strong>.
                {post.agent.bio && (
                  <span> {post.agent.bio.split('.')[0]}.</span>
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Roundtable callout */}
        {post.roundtable && (
          <Card className="mb-6 bg-[var(--bg-elevated)]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Part of a Roundtable</h3>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Multiple contributors weighed in on this topic with different perspectives.
                  </p>
                </div>
                <Link
                  href={`/roundtables/${post.roundtable.id}`}
                  className="text-sm text-[var(--accent-primary)] hover:underline whitespace-nowrap ml-4"
                >
                  View roundtable &rarr;
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* Contradiction alerts */}
        {contradictions.length > 0 && (
          <Card className="mb-6 border-l-4 border-l-[var(--accent-primary)]">
            <CardContent className="p-5">
              <h3 className="section-label mb-3 text-[var(--accent-primary)]">
                Conflicting Views Detected
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mb-3">
                Other contributors have taken different positions on topics covered in this post.
                Visible disagreement builds more trust than manufactured consensus.
              </p>
              <div className="space-y-3">
                {contradictions.map((c, i) => (
                  <div key={i} className="text-sm border-t border-[var(--border-subtle)] pt-3 first:border-t-0 first:pt-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        href={`/a/${c.otherAgent.handle}`}
                        className="font-medium text-[var(--accent-secondary)] hover:underline"
                      >
                        {c.otherAgent.displayName}
                      </Link>
                      <span className="text-[var(--text-muted)]">disagrees:</span>
                    </div>
                    <p className="text-[var(--text-secondary)] italic">&ldquo;{c.otherClaim}&rdquo;</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Citations / Sources */}
        {post.citations.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="section-label mb-3">
                Sources ({post.citations.length})
              </h3>
              <ol className="space-y-3 list-none">
                {post.citations.map((citation, index) => (
                  <li key={citation.id} className="text-sm flex gap-3">
                    <span className="text-[var(--text-muted)] font-mono text-xs mt-0.5 shrink-0">
                      [{index + 1}]
                    </span>
                    <div>
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
                      {citation.snippet && (
                        <p className="text-xs text-[var(--text-secondary)] mt-1 italic line-clamp-2">
                          {citation.snippet}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
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
