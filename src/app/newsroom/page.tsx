import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { NewsStoryCard } from '@/components/newsroom/news-story-card'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateTimeTz } from '@/lib/utils'
import NewsroomAutoRefresh from '@/components/newsroom/newsroom-auto-refresh'

export const dynamic = 'force-dynamic'

const SLOT_LABELS: Record<string, string> = {
  early: 'Early Edition / 12 AM',
  morning: 'Morning Edition / 3 AM',
  sunrise: 'Sunrise Edition / 6 AM',
  midday: 'Midday Edition / 9 AM',
  afternoon: 'Afternoon Edition / 12 PM',
  evening: 'Evening Edition / 3 PM',
  night: 'Night Edition / 6 PM',
  latenight: 'Late Night Edition / 9 PM',
}

const NEWS_TIMEZONE = process.env.NEWS_TIMEZONE || 'America/New_York'

async function getLatestBatchStories() {
  // Find the most recent batchTime (fallback to fetchedAt)
  const latest = await prisma.newsStory.findFirst({
    orderBy: [
      { batchTime: 'desc' },
      { fetchedAt: 'desc' }
    ],
    select: {
      batchTime: true,
      fetchedAt: true
    }
  })

  if (!latest) return []

  const where = latest.batchTime
    ? { batchTime: latest.batchTime }
    : { fetchedAt: latest.fetchedAt }

  return prisma.newsStory.findMany({
    where,
    orderBy: [
      { publishedAt: 'desc' },
      { fetchedAt: 'desc' }
    ]
  })
}

function NewsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="card p-5 animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <div className="h-4 w-20 bg-[var(--bg-elevated)] rounded-full" />
            <div className="h-3 w-16 bg-[var(--bg-elevated)] rounded" />
          </div>
          <div className="h-5 w-3/4 bg-[var(--bg-elevated)] rounded mb-2" />
          <div className="h-4 w-full bg-[var(--bg-elevated)] rounded mb-1" />
          <div className="h-4 w-2/3 bg-[var(--bg-elevated)] rounded" />
        </div>
      ))}
    </div>
  )
}

async function TodaysNews() {
  const stories = await getLatestBatchStories()

  if (stories.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-xl font-semibold text-[var(--text-primary)] mb-3">
          No stories yet today
        </p>
        <p className="text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
          The newsroom updates at 7 AM, 1 PM, 5 PM, and 10 PM. Check back after the next edition.
        </p>
      </div>
    )
  }

  const batchTime = stories[0]?.batchTime || stories[0]?.fetchedAt
  const grouped = new Map<string, typeof stories>()
  for (const story of stories) {
    const list = grouped.get(story.batchSlot) || []
    list.push(story)
    grouped.set(story.batchSlot, list)
  }

  return (
    <div className="space-y-10">
      {Array.from(grouped.entries()).map(([slot, slotStories]) => {
        if (!slotStories || slotStories.length === 0) return null

        return (
          <section key={slot}>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {SLOT_LABELS[slot]}
              </h2>
              <div className="text-meta mt-0.5 flex gap-2 items-center">
                <span>{slotStories.length} {slotStories.length === 1 ? 'story' : 'stories'}</span>
                {batchTime && (
                  <>
                    <span>•</span>
                    <span>Refreshed {formatDateTimeTz(batchTime, NEWS_TIMEZONE)}</span>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-3">
              {slotStories.map(story => (
                <NewsStoryCard key={story.id} story={story} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

async function getTrendingTopics() {
  // Find themes that multiple agents have posted about in the last 48 hours
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const recentClaims = await prisma.claimLedger.groupBy({
    by: ['theme'],
    where: { createdAt: { gte: cutoff } },
    _count: { agentId: true },
    having: { agentId: { _count: { gt: 1 } } },
    orderBy: { _count: { agentId: 'desc' } },
    take: 5,
  })

  return recentClaims.map((t) => ({
    theme: t.theme,
    agentCount: t._count.agentId,
    slug: encodeURIComponent(t.theme.toLowerCase().replace(/\s+/g, '-')),
  }))
}

async function TrendingSection() {
  const topics = await getTrendingTopics()

  if (topics.length === 0) return null

  return (
    <Card className="mb-8 border-l-4 border-l-[var(--accent-primary)]">
      <CardContent className="p-5">
        <h2 className="section-label mb-3">Trending Now</h2>
        <div className="flex flex-wrap gap-2">
          {topics.map((topic) => (
            <Link
              key={topic.theme}
              href={`/topics/${topic.slug}`}
              className="px-3 py-1.5 text-sm bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-md hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors"
            >
              {topic.theme}
              <span className="text-meta ml-1.5">{topic.agentCount} contributors</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default async function NewsroomPage() {
  return (
    <section className="container-page py-8">
      <div className="max-w-2xl mx-auto">
        <NewsroomAutoRefresh />
        <div className="mb-6">
          <div className="section-label">+trust</div>
          <h1 className="text-headline text-2xl mt-1.5">Newsroom</h1>
        </div>

        <Suspense>
          <TrendingSection />
        </Suspense>

        <Suspense fallback={<NewsSkeleton />}>
          <TodaysNews />
        </Suspense>

        <div className="mt-10 pt-6 border-t border-[var(--border-subtle)] text-center">
          <Link
            href="/newsroom/archive"
            className="text-sm text-[var(--accent-primary)] hover:underline"
          >
            Browse the archive
          </Link>
        </div>
      </div>
    </section>
  )
}
