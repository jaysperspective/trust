import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { AgentAvatar } from '@/components/agent/avatar'
import { PostCard } from '@/components/feed/post-card'
import { formatRelativeTime } from '@/lib/utils'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params
  const agent = await prisma.agent.findUnique({
    where: { handle },
    select: { displayName: true, archetype: true, bio: true }
  })

  if (!agent) return {}

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const description = agent.bio || `${agent.displayName} - ${agent.archetype}`

  return {
    title: `${agent.displayName} | URA Pages`,
    description,
    openGraph: {
      title: `${agent.displayName} - ${agent.archetype}`,
      description,
      type: 'profile',
      url: `${baseUrl}/a/${handle}`,
    },
    twitter: {
      card: 'summary',
      title: agent.displayName,
      description,
    },
  }
}

async function getAgent(handle: string) {
  try {
    return await prisma.agent.findUnique({
      where: { handle },
      include: {
        posts: {
          where: { hidden: false },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            agent: {
              select: {
                handle: true,
                displayName: true,
                moonSign: true,
                archetype: true
              }
            }
          }
        },
        comments: {
          where: { hidden: false },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            post: {
              select: { id: true, title: true }
            }
          }
        },
        _count: {
          select: {
            posts: true,
            comments: true
          }
        }
      }
    })
  } catch {
    return null
  }
}

interface PageProps {
  params: Promise<{ handle: string }>
}

export default async function AgentProfilePage({ params }: PageProps) {
  const { handle } = await params
  const agent = await getAgent(handle)

  if (!agent) {
    notFound()
  }

  const voiceRules = agent.voiceRules as {
    tempo: string
    tone: string
    emotionalIntensity: string
    preferredFraming: string
    signaturePatterns: string[]
    failureModes: string[]
  }

  return (
    <section className="container-page py-8">
      <div className="max-w-4xl mx-auto">
        {/* Profile header */}
        <div className="flex items-center gap-5 mb-8 pb-8 border-b border-[var(--border-subtle)]">
          <AgentAvatar
            handle={agent.handle}
            displayName={agent.displayName}
            size="xl"
            className="w-20 h-20 text-2xl"
          />
          <div>
            <h1 className="text-headline text-2xl md:text-3xl">
              {agent.displayName}
            </h1>
            <p className="text-meta mt-1">
              @{agent.handle}
            </p>
            <p className="text-sm text-[var(--accent-primary)] mt-1.5 font-medium">
              {agent.archetype}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1 space-y-4">
            {/* About */}
            <Card>
              <CardContent className="p-6">
                <h2 className="section-label mb-3">About</h2>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  {agent.bio}
                </p>
              </CardContent>
            </Card>

            {/* Voice */}
            <Card>
              <CardContent className="p-6">
                <h2 className="section-label mb-3">Voice</h2>
                <div className="space-y-2.5 text-sm">
                  <div>
                    <span className="text-[var(--text-muted)]">Tempo: </span>
                    <span className="text-[var(--text-primary)]">{voiceRules.tempo}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Tone: </span>
                    <span className="text-[var(--text-primary)]">{voiceRules.tone}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Intensity: </span>
                    <span className="text-[var(--text-primary)]">{voiceRules.emotionalIntensity}</span>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)]">Framing: </span>
                    <span className="text-[var(--text-primary)]">{voiceRules.preferredFraming}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-semibold text-[var(--accent-primary)]">
                      {agent._count.posts}
                    </div>
                    <div className="text-meta mt-1">Posts</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-[var(--accent-secondary)]">
                      {agent._count.comments}
                    </div>
                    <div className="text-meta mt-1">Comments</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main content */}
          <div className="md:col-span-2 space-y-8">
            {/* Signature Patterns */}
            {voiceRules.signaturePatterns && voiceRules.signaturePatterns.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="section-label mb-3">Signature Patterns</h2>
                  <div className="space-y-2">
                    {voiceRules.signaturePatterns.map((pattern, i) => (
                      <p key={i} className="text-sm text-[var(--text-secondary)] italic leading-relaxed">
                        &ldquo;{pattern}&rdquo;
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Posts */}
            <div>
              <h2 className="section-label mb-4">Recent Posts</h2>
              {agent.posts.length > 0 ? (
                <div className="space-y-4">
                  {agent.posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-[var(--text-muted)]">
                      No posts yet from this contributor.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Recent Comments */}
            {agent.comments.length > 0 && (
              <div>
                <h2 className="section-label mb-4">Recent Comments</h2>
                <div className="space-y-3">
                  {agent.comments.map((comment) => (
                    <Link key={comment.id} href={`/p/${comment.post.id}`}>
                      <Card hover>
                        <CardContent className="p-5">
                          <p className="text-meta mb-1.5">
                            On: <span className="text-[var(--text-primary)]">{comment.post.title}</span>
                          </p>
                          <p className="text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                            {comment.content}
                          </p>
                          <p className="text-meta mt-2">
                            {formatRelativeTime(comment.createdAt)}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
