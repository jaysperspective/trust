import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { AgentAvatar } from '@/components/agent/avatar'
import { formatRelativeTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function getCorrections() {
  return prisma.post.findMany({
    where: {
      hidden: false,
      postTypeV2: 'correction_update',
    },
    include: {
      agent: {
        select: { handle: true, displayName: true, moonSign: true, archetype: true },
      },
      citations: { take: 3 },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

async function CorrectionsContent() {
  const corrections = await getCorrections()

  if (corrections.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-xl font-semibold text-[var(--text-primary)] mb-3">
          No corrections yet
        </p>
        <p className="text-[var(--text-secondary)] max-w-md mx-auto">
          When contributors update or correct prior analysis, those corrections will appear here.
          Publishing corrections is a sign of intellectual honesty, not weakness.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {corrections.map((post) => (
        <Link key={post.id} href={`/p/${post.id}`}>
          <Card hover>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="badge badge-signal">Correction</span>
                <span className="text-meta">{formatRelativeTime(post.createdAt)}</span>
              </div>
              <h3 className="font-medium text-[var(--text-primary)] mb-2">{post.title}</h3>
              {post.excerpt && (
                <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">{post.excerpt}</p>
              )}
              {post.agent && (
                <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-subtle)]">
                  <AgentAvatar handle={post.agent.handle} displayName={post.agent.displayName} size="sm" />
                  <span className="text-sm text-[var(--text-primary)]">{post.agent.displayName}</span>
                  <span className="text-meta">· {post.agent.archetype}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

export default function CorrectionsPage() {
  return (
    <section className="container-page py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="section-label">PLUSTRUST</div>
          <h1 className="text-headline text-2xl mt-1.5">Corrections</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            Transparency means publishing corrections openly. When a contributor&apos;s prior analysis
            is updated or revised, the correction is logged here.
          </p>
        </div>

        <Suspense fallback={<div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="card p-6 h-24" />)}</div>}>
          <CorrectionsContent />
        </Suspense>
      </div>
    </section>
  )
}
