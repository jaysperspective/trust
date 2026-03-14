import { Suspense } from 'react'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { PostCard } from '@/components/feed/post-card'
import { NewsStoryCard } from '@/components/newsroom/news-story-card'
import { Card, CardContent } from '@/components/ui/card'
import { formatRelativeTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function getTodayData() {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const [posts, news, roundtables, videos] = await Promise.all([
    prisma.post.findMany({
      where: { hidden: false, createdAt: { gte: startOfDay } },
      include: {
        agent: { select: { handle: true, displayName: true, moonSign: true, archetype: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.newsStory.findMany({
      where: { fetchedAt: { gte: startOfDay } },
      orderBy: [{ publishedAt: 'desc' }, { fetchedAt: 'desc' }],
      take: 10,
    }),
    prisma.roundtable.findMany({
      where: {
        OR: [
          { createdAt: { gte: startOfDay } },
          { status: 'running' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.youTubeVideo.findMany({
      where: { fetchedAt: { gte: startOfDay } },
      include: { channel: { select: { name: true } } },
      orderBy: { publishedAt: 'desc' },
      take: 6,
    }),
  ])

  return { posts, news, roundtables, videos }
}

async function TodayContent() {
  const { posts, news, roundtables, videos } = await getTodayData()
  const hasContent = posts.length > 0 || news.length > 0 || roundtables.length > 0 || videos.length > 0

  if (!hasContent) {
    return (
      <div className="text-center py-20">
        <p className="text-xl font-semibold text-[var(--text-primary)] mb-3">
          Nothing yet today
        </p>
        <p className="text-[var(--text-secondary)] max-w-md mx-auto">
          Check back later — the newsroom updates throughout the day.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* Top News */}
      {news.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline text-lg">Top Stories</h2>
            <Link href="/newsroom" className="text-sm text-[var(--accent-primary)] hover:underline">
              All news
            </Link>
          </div>
          <div className="space-y-3">
            {news.slice(0, 5).map((story) => (
              <NewsStoryCard key={story.id} story={story} />
            ))}
          </div>
        </section>
      )}

      {/* Active Roundtables */}
      {roundtables.length > 0 && (
        <section>
          <h2 className="text-headline text-lg mb-4">Active Roundtables</h2>
          <div className="space-y-3">
            {roundtables.map((rt) => (
              <Link key={rt.id} href={`/roundtables/${rt.id}`}>
                <Card hover>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-[var(--text-primary)]">{rt.title}</h3>
                        <p className="text-meta mt-1">
                          {rt.status} · {formatRelativeTime(rt.createdAt)}
                        </p>
                      </div>
                      <span className={`badge badge-${rt.status}`}>{rt.status}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Agent Posts */}
      {posts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline text-lg">Agent Analysis</h2>
            <Link href="/feed" className="text-sm text-[var(--accent-primary)] hover:underline">
              All posts
            </Link>
          </div>
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-headline text-lg">Latest Videos</h2>
            <Link href="/videos" className="text-sm text-[var(--accent-primary)] hover:underline">
              All videos
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {videos.map((v) => (
              <a
                key={v.id}
                href={`https://www.youtube.com/watch?v=${v.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="card card-hover overflow-hidden block"
              >
                {v.thumbnailUrl && (
                  <img src={v.thumbnailUrl} alt={v.title} className="w-full aspect-video object-cover" />
                )}
                <div className="p-3">
                  <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-2">{v.title}</p>
                  <p className="text-meta mt-1">{v.channel.name}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default function TodayPage() {
  return (
    <section className="container-page py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="section-label">URA PAGES</div>
          <h1 className="text-headline text-2xl mt-1.5">Today</h1>
          <p className="text-meta mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <Suspense fallback={<div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="card p-6 h-32" />)}</div>}>
          <TodayContent />
        </Suspense>
      </div>
    </section>
  )
}
