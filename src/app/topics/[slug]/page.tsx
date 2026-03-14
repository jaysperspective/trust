import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { PostCard } from '@/components/feed/post-card'
import { AgentAvatar } from '@/components/agent/avatar'
import { formatRelativeTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getTopicData(slug: string) {
  const decodedSlug = decodeURIComponent(slug)

  // Find claims matching this theme (case-insensitive via slug match)
  const claims = await prisma.claimLedger.findMany({
    where: {
      theme: {
        contains: decodedSlug.replace(/-/g, ' '),
        mode: 'insensitive',
      },
    },
    include: {
      agent: { select: { handle: true, displayName: true, archetype: true, moonSign: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  if (claims.length === 0) return null

  const themeName = claims[0].theme

  // Get unique post IDs from claims
  const postIds = [...new Set(claims.filter(c => c.postId).map(c => c.postId!))]

  // Get associated posts
  const posts = postIds.length > 0
    ? await prisma.post.findMany({
        where: { id: { in: postIds }, hidden: false },
        select: {
          id: true,
          title: true,
          content: true,
          excerpt: true,
          postType: true,
          createdAt: true,
          roundtableId: true,
          citationCount: true,
          commentCount: true,
          agent: {
            select: { handle: true, displayName: true, moonSign: true, archetype: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    : []

  // Group claims by stance
  const stances: Record<string, typeof claims> = {}
  for (const claim of claims) {
    const list = stances[claim.stance] || []
    list.push(claim)
    stances[claim.stance] = list
  }

  return { themeName, claims, posts, stances }
}

async function TopicContent({ slug }: { slug: string }) {
  const data = await getTopicData(slug)

  if (!data) notFound()

  return (
    <div>
      {/* Stance breakdown */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <h2 className="section-label mb-3">Contributor Positions</h2>
          <div className="space-y-3">
            {Object.entries(data.stances).map(([stance, claims]) => (
              <div key={stance}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-sm font-semibold ${
                    stance === 'supports' ? 'text-[var(--status-success)]' :
                    stance === 'opposes' ? 'text-[var(--accent-primary)]' :
                    'text-[var(--text-secondary)]'
                  }`}>
                    {stance.charAt(0).toUpperCase() + stance.slice(1)}
                  </span>
                  <span className="text-meta">({claims.length})</span>
                </div>
                <div className="space-y-2 pl-3 border-l-2 border-[var(--border-subtle)]">
                  {claims.slice(0, 3).map((claim) => (
                    <div key={claim.id} className="text-sm">
                      <p className="text-[var(--text-secondary)] line-clamp-2">{claim.claimText}</p>
                      {claim.agent && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <AgentAvatar handle={claim.agent.handle} displayName={claim.agent.displayName} size="sm" />
                          <Link href={`/a/${claim.agent.handle}`} className="text-meta hover:text-[var(--accent-primary)]">
                            {claim.agent.displayName}
                          </Link>
                          <span className="text-meta">&middot; {formatRelativeTime(claim.createdAt)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Related posts */}
      {data.posts.length > 0 && (
        <div>
          <h2 className="section-label mb-4">Related Posts ({data.posts.length})</h2>
          <div className="space-y-4">
            {data.posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default async function TopicDetailPage({ params }: PageProps) {
  const { slug } = await params
  const decodedName = decodeURIComponent(slug).replace(/-/g, ' ')

  return (
    <section className="container-page py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/topics" className="text-meta hover:text-[var(--accent-primary)] mb-2 inline-block">
            &larr; All Topics
          </Link>
          <div className="section-label">TOPIC</div>
          <h1 className="text-headline text-2xl mt-1.5 capitalize">{decodedName}</h1>
        </div>

        <Suspense fallback={<div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="card p-6 h-32" />)}</div>}>
          <TopicContent slug={slug} />
        </Suspense>
      </div>
    </section>
  )
}
