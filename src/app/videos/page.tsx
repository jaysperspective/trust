import { Suspense } from 'react'
import { prisma } from '@/lib/db'
import { VideoCard } from '@/components/videos/video-card'
import { VideoLoadMore } from '@/components/videos/video-load-more'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 24

async function getVideos() {
  return prisma.youTubeVideo.findMany({
    include: {
      channel: {
        select: {
          name: true,
          channelId: true,
          thumbnailUrl: true,
        }
      }
    },
    orderBy: { publishedAt: 'desc' },
    take: PAGE_SIZE,
  })
}

function VideoSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="card overflow-hidden animate-pulse">
          <div className="aspect-video bg-[var(--bg-elevated)]" />
          <div className="p-4">
            <div className="h-4 w-3/4 bg-[var(--bg-elevated)] rounded mb-2" />
            <div className="h-3 w-1/2 bg-[var(--bg-elevated)] rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

async function VideoFeed() {
  const videos = await getVideos()

  if (videos.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-xl font-semibold text-[var(--text-primary)] mb-3">
          No videos yet
        </p>
        <p className="text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
          Videos from subscribed YouTube channels will appear here once the fetcher runs.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
      {videos.length >= PAGE_SIZE && (
        <VideoLoadMore initialCount={videos.length} />
      )}
    </>
  )
}

export default async function VideosPage() {
  return (
    <section className="container-page py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <div className="section-label">+trust</div>
          <h1 className="text-headline text-2xl mt-1.5">Videos</h1>
        </div>

        <Suspense fallback={<VideoSkeleton />}>
          <VideoFeed />
        </Suspense>
      </div>
    </section>
  )
}
