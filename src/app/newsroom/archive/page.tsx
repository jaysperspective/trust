import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { NewsStoryCard } from '@/components/newsroom/news-story-card'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 30

async function getArchiveStories(query?: string, page = 1) {
  const skip = (page - 1) * PAGE_SIZE

  // Determine latest batch time to exclude from archive
  const latestBatch = await prisma.newsStory.findFirst({
    orderBy: [
      { batchTime: 'desc' },
      { fetchedAt: 'desc' }
    ],
    select: { batchTime: true, fetchedAt: true }
  })

  const latestBatchTime = latestBatch?.batchTime || latestBatch?.fetchedAt

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = latestBatchTime
    ? {
        NOT: {
          OR: [
            { batchTime: latestBatch?.batchTime || undefined },
            { AND: [{ batchTime: null }, { fetchedAt: latestBatchTime }] }
          ]
        }
      }
    : {}

  if (query && query.trim()) {
    const words = query.trim().split(/\s+/).filter(w => w.length > 2)
    if (words.length > 0) {
      where.OR = words.flatMap((word: string) => [
        { title: { contains: word, mode: 'insensitive' } },
        { snippet: { contains: word, mode: 'insensitive' } },
      ])
    }
  }

  const [stories, total] = await Promise.all([
    prisma.newsStory.findMany({
      where,
      orderBy: { fetchedAt: 'desc' },
      take: PAGE_SIZE,
      skip,
    }),
    prisma.newsStory.count({ where }),
  ])

  return { stories, total, page }
}

async function ArchiveResults({ query, page }: { query?: string; page: number }) {
  const { stories, total } = await getArchiveStories(query, page)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (stories.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-secondary)]">
          {query ? `No stories found for "${query}"` : 'No archived stories yet. Stories from previous days will appear here.'}
        </p>
      </div>
    )
  }

  return (
    <>
      <p className="text-meta mb-4">{total} {total === 1 ? 'story' : 'stories'} found</p>
      <div className="space-y-3">
        {stories.map(story => (
          <NewsStoryCard key={story.id} story={story} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          {page > 1 && (
            <Link
              href={`/newsroom/archive?q=${encodeURIComponent(query || '')}&page=${page - 1}`}
              className="px-4 py-2 text-sm font-medium rounded-full border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-medium)] transition-colors"
            >
              Previous
            </Link>
          )}
          <span className="text-meta">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link
              href={`/newsroom/archive?q=${encodeURIComponent(query || '')}&page=${page + 1}`}
              className="px-4 py-2 text-sm font-medium rounded-full border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-medium)] transition-colors"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </>
  )
}

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>
}

export default async function ArchivePage({ searchParams }: PageProps) {
  const { q, page: pageStr } = await searchParams
  const page = Math.max(1, parseInt(pageStr || '1', 10))

  return (
    <section className="container-page py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="section-label">URA</div>
          <h1 className="text-headline text-2xl mt-1.5">News Archive</h1>
        </div>

        <form method="GET" className="mb-6">
          <input
            type="text"
            name="q"
            defaultValue={q || ''}
            placeholder="Search archived stories..."
            className="w-full px-4 py-2.5 text-sm bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-full text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
          />
        </form>

        <Suspense fallback={<div className="text-meta py-8 text-center">Loading archive...</div>}>
          <ArchiveResults query={q} page={page} />
        </Suspense>

        <div className="mt-10 pt-6 border-t border-[var(--border-subtle)] text-center">
          <Link
            href="/newsroom"
            className="text-sm text-[var(--accent-primary)] hover:underline"
          >
            Back to today&apos;s newsroom
          </Link>
        </div>
      </div>
    </section>
  )
}
