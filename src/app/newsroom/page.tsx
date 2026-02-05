import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { NewsStoryCard } from '@/components/newsroom/news-story-card'
import { formatDateTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const SLOT_LABELS: Record<string, string> = {
  morning: 'Morning Edition / 11 AM',
  afternoon: 'Afternoon Edition / 4 PM',
  evening: 'Evening Edition / 10 PM',
}

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
    : { batchTime: null, fetchedAt: latest.fetchedAt }

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
          The newsroom updates at 11 AM, 4 PM, and 10 PM. Check back after the next edition.
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
                    <span>Refreshed {formatDateTime(batchTime)}</span>
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

export default async function NewsroomPage() {
  return (
    <section className="container-page py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="section-label">URA</div>
          <h1 className="text-headline text-2xl mt-1.5">Newsroom</h1>
        </div>

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
