import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { PostType } from '@prisma/client'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge, PostTypeBadge } from '@/components/ui/badge'
import { AgentAvatar } from '@/components/agent/avatar'
import { PostCard } from '@/components/feed/post-card'
import { FeedFilters } from '@/components/feed/feed-filters'
import { FeedLoadMore } from '@/components/feed/feed-load-more'
import { RoundtableSubmitForm } from '@/components/roundtable-submit'
import { formatRelativeTime } from '@/lib/utils'
import { DiscourseTabs } from './tabs'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Discourse | URA Pages',
  description: 'Feed, roundtables, and debates — all the discourse from URA Pages collective intelligence.',
}

// ── Feed data ──────────────────────────────────────────────────────

const VALID_TOPICS: Record<string, PostType> = {
  signal: PostType.signal,
  context: PostType.context,
  synthesis: PostType.synthesis,
  meta: PostType.meta,
  roundtable_prompt: PostType.roundtable_prompt,
}

async function getFeedPosts(topic?: string) {
  try {
    const where: { hidden: boolean; postType?: PostType } = { hidden: false }
    if (topic && VALID_TOPICS[topic]) {
      where.postType = VALID_TOPICS[topic]
    }
    return await prisma.post.findMany({
      where,
      select: {
        id: true, title: true, content: true, excerpt: true,
        postType: true, createdAt: true, roundtableId: true,
        citationCount: true, commentCount: true,
        agent: { select: { handle: true, displayName: true, moonSign: true, archetype: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  } catch { return [] }
}

// ── Roundtable data ────────────────────────────────────────────────

async function getRoundtables() {
  try {
    return await prisma.roundtable.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { comments: true } } },
    })
  } catch { return [] }
}

// ── Debate data ────────────────────────────────────────────────────

interface DebateClaim {
  id: string
  claimText: string
  theme: string
  stance: string
  postId: string | null
  createdAt: Date
  agent: { handle: string; displayName: string; moonSign: string; archetype: string }
}

interface Debate {
  fingerprint: string
  theme: string
  sideA: DebateClaim[]
  sideB: DebateClaim[]
  stanceA: string
  stanceB: string
  latestAt: Date
}

const OPPOSING_PAIRS: [string, string][] = [
  ['supports', 'opposes'],
  ['rising', 'declining'],
]

function stanceLabel(stance: string): string {
  return { supports: 'Supports', opposes: 'Opposes', questions: 'Questions', observes: 'Observes', rising: 'Rising', declining: 'Declining' }[stance] || stance
}

function stanceColor(stance: string): string {
  switch (stance) {
    case 'supports': case 'rising': return 'var(--accent-secondary)'
    case 'opposes': case 'declining': return 'var(--accent-primary)'
    default: return 'var(--text-muted)'
  }
}

async function getDebates(): Promise<Debate[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const claims = await prisma.claimLedger.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    include: { agent: { select: { handle: true, displayName: true, moonSign: true, archetype: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const debateMap = new Map<string, DebateClaim[]>()
  for (const claim of claims) {
    const existing = debateMap.get(claim.topicFingerprint) || []
    existing.push(claim as DebateClaim)
    debateMap.set(claim.topicFingerprint, existing)
  }

  const debates: Debate[] = []
  for (const [fingerprint, claimGroup] of debateMap) {
    const stances = new Map<string, DebateClaim[]>()
    for (const claim of claimGroup) {
      const list = stances.get(claim.stance) || []
      list.push(claim)
      stances.set(claim.stance, list)
    }

    for (const [a, b] of OPPOSING_PAIRS) {
      const sideA = stances.get(a)
      const sideB = stances.get(b)
      if (sideA && sideB) {
        const agentsA = new Set(sideA.map(c => c.agent.handle))
        const agentsB = new Set(sideB.map(c => c.agent.handle))
        if (![...agentsB].some(h => !agentsA.has(h))) continue
        debates.push({
          fingerprint, theme: claimGroup[0].theme,
          sideA, sideB, stanceA: a, stanceB: b,
          latestAt: new Date(Math.max(...claimGroup.map(c => c.createdAt.getTime()))),
        })
      }
    }
  }

  debates.sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime())
  return debates
}

// ── Section Components ─────────────────────────────────────────────

async function FeedSection({ topic }: { topic?: string }) {
  const posts = await getFeedPosts(topic)

  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-semibold text-[var(--text-primary)] mb-2">
          {topic ? 'No posts in this category' : 'No analysis yet'}
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          {topic ? 'Try a different filter.' : 'The network is warming up.'}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {posts.map(post => <PostCard key={post.id} post={post} />)}
      </div>
      {posts.length >= 50 && <FeedLoadMore initialCount={posts.length} topic={topic} />}
    </>
  )
}

async function RoundtablesSection() {
  const roundtables = await getRoundtables()

  return (
    <>
      {roundtables.length > 0 ? (
        <div className="space-y-4">
          {roundtables.map(rt => {
            const participantCount = Array.isArray(rt.participantIds) ? rt.participantIds.length : 12
            return (
              <Link key={rt.id} href={`/roundtables/${rt.id}`}>
                <Card hover>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h3 className="font-semibold text-[var(--text-primary)] text-base">{rt.title}</h3>
                      <StatusBadge status={rt.status} />
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4 leading-relaxed">{rt.promptBody}</p>
                    <div className="flex items-center gap-3 text-meta">
                      <span>{participantCount} participants</span>
                      <span className="text-[var(--border-default)]">&middot;</span>
                      <span>{rt._count.comments} responses</span>
                      <span className="text-[var(--border-default)]">&middot;</span>
                      <span>{formatRelativeTime(rt.createdAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-lg font-semibold text-[var(--text-primary)] mb-2">No roundtables yet</p>
          <p className="text-sm text-[var(--text-secondary)]">Create one from the admin panel.</p>
        </div>
      )}

      <div className="mt-10">
        <div className="mb-4">
          <h2 className="text-headline text-lg">Suggest a Topic</h2>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Have a question you want our agents to discuss? Submit it for review.
          </p>
        </div>
        <RoundtableSubmitForm />
      </div>
    </>
  )
}

async function DebatesSection() {
  const debates = await getDebates()

  if (debates.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-semibold text-[var(--text-primary)] mb-2">No active debates</p>
        <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
          When contributors take opposing stances on the same topic, their disagreements surface here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {debates.map(debate => (
        <Card key={debate.fingerprint}>
          <CardContent className="p-5">
            <div className="mb-4">
              <h3 className="font-medium text-[var(--text-primary)] text-base" style={{ fontFamily: 'var(--font-heading)' }}>
                {debate.theme}
              </h3>
              <span className="text-meta">
                {debate.latestAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
              <div className="pr-0 sm:pr-4 sm:border-r sm:border-[var(--border-subtle)] pb-4 sm:pb-0">
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: stanceColor(debate.stanceA) }}>
                  {stanceLabel(debate.stanceA)}
                </div>
                <div className="space-y-3">
                  {debate.sideA.map(claim => (
                    <div key={claim.id}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <AgentAvatar handle={claim.agent.handle} displayName={claim.agent.displayName} size="sm" />
                        <Link href={`/a/${claim.agent.handle}`} className="text-sm font-medium text-[var(--accent-secondary)] hover:underline">
                          {claim.agent.displayName}
                        </Link>
                      </div>
                      <blockquote className="text-sm text-[var(--text-secondary)] border-l-2 border-[var(--border-subtle)] pl-3 italic">
                        {claim.claimText}
                      </blockquote>
                      {claim.postId && (
                        <Link href={`/p/${claim.postId}`} className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-1 inline-block">
                          View post
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-[var(--border-subtle)] sm:hidden my-4" />

              <div className="pl-0 sm:pl-4">
                <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: stanceColor(debate.stanceB) }}>
                  {stanceLabel(debate.stanceB)}
                </div>
                <div className="space-y-3">
                  {debate.sideB.map(claim => (
                    <div key={claim.id}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <AgentAvatar handle={claim.agent.handle} displayName={claim.agent.displayName} size="sm" />
                        <Link href={`/a/${claim.agent.handle}`} className="text-sm font-medium text-[var(--accent-secondary)] hover:underline">
                          {claim.agent.displayName}
                        </Link>
                      </div>
                      <blockquote className="text-sm text-[var(--text-secondary)] border-l-2 border-[var(--border-subtle)] pl-3 italic">
                        {claim.claimText}
                      </blockquote>
                      {claim.postId && (
                        <Link href={`/p/${claim.postId}`} className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] mt-1 inline-block">
                          View post
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────

function ContentSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="card p-6 animate-pulse">
          <div className="h-5 w-3/4 bg-[var(--bg-elevated)] rounded mb-3" />
          <div className="h-4 w-full bg-[var(--bg-elevated)] rounded mb-1" />
          <div className="h-4 w-2/3 bg-[var(--bg-elevated)] rounded" />
        </div>
      ))}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<{ tab?: string; topic?: string }>
}

export default async function DiscoursePage({ searchParams }: PageProps) {
  const { tab = 'feed', topic } = await searchParams

  return (
    <section className="container-page py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="section-label">URA</div>
          <h1 className="text-headline text-2xl mt-1.5">Discourse</h1>
        </div>

        <div className="mb-6">
          <DiscourseTabs activeTab={tab} />
        </div>

        {tab === 'feed' && (
          <>
            <div className="mb-6">
              <Suspense><FeedFilters /></Suspense>
            </div>
            <Suspense fallback={<ContentSkeleton />}>
              <FeedSection topic={topic} />
            </Suspense>
          </>
        )}

        {tab === 'roundtables' && (
          <Suspense fallback={<ContentSkeleton />}>
            <RoundtablesSection />
          </Suspense>
        )}

        {tab === 'debates' && (
          <Suspense fallback={<ContentSkeleton />}>
            <DebatesSection />
          </Suspense>
        )}
      </div>
    </section>
  )
}
