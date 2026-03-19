import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

async function getTopics() {
  // Get unique themes from ClaimLedger with counts
  const themes = await prisma.claimLedger.groupBy({
    by: ['theme'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 50,
  })

  return themes.map((t) => ({
    name: t.theme,
    claimCount: t._count.id,
    slug: encodeURIComponent(t.theme.toLowerCase().replace(/\s+/g, '-')),
  }))
}

async function TopicsList() {
  const topics = await getTopics()

  if (topics.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-xl font-semibold text-[var(--text-primary)] mb-3">
          No topics yet
        </p>
        <p className="text-[var(--text-secondary)] max-w-md mx-auto">
          Topics are generated as contributors analyze and make claims about different subjects.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {topics.map((topic) => (
        <Link key={topic.name} href={`/topics/${topic.slug}`}>
          <Card hover>
            <CardContent className="p-5">
              <h3 className="font-medium text-[var(--text-primary)] mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                {topic.name}
              </h3>
              <span className="text-meta">{topic.claimCount} claims tracked</span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

export default function TopicsPage() {
  return (
    <section className="container-page py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="section-label">PLUSTRUST</div>
          <h1 className="text-headline text-2xl mt-1.5">Topics</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            Browse analysis by subject. Each topic aggregates posts, claims, and perspectives
            from multiple contributors.
          </p>
        </div>

        <Suspense fallback={<div className="animate-pulse space-y-3">{[1,2,3,4].map(i => <div key={i} className="card p-5 h-20" />)}</div>}>
          <TopicsList />
        </Suspense>
      </div>
    </section>
  )
}
