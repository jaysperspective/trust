import { Suspense } from 'react'
import { prisma } from '@/lib/db'
import { VideoCard } from '@/components/videos/video-card'
import { VideoLoadMore } from '@/components/videos/video-load-more'
import { formatRelativeTime } from '@/lib/utils'

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

async function getChannels() {
  return prisma.youTubeChannel.findMany({
    where: { enabled: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      channelId: true,
      thumbnailUrl: true,
      _count: { select: { videos: true } },
    },
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
          Videos from subscribed YouTube channels will appear here once channels are added and the fetcher runs.
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

async function ChannelSidebar() {
  const channels = await getChannels()

  if (channels.length === 0) return null

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {channels.map((channel) => (
          <a
            key={channel.id}
            href={`/videos?channel=${channel.channelId}`}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border-default)] hover:border-[var(--border-hover)] bg-[var(--bg-surface)] whitespace-nowrap text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            {channel.thumbnailUrl ? (
              <img src={channel.thumbnailUrl} alt="" className="w-5 h-5 rounded-full" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-xs text-[var(--accent-primary)]">
                {channel.name.charAt(0)}
              </div>
            )}
            <span>{channel.name}</span>
            <span className="text-[var(--text-muted)] text-xs">{channel._count.videos}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

export default async function VideosPage() {
  return (
    <section className="container-page py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <div className="section-label">URA</div>
          <h1 className="text-headline text-2xl mt-1.5">Videos</h1>
        </div>

        <Suspense fallback={null}>
          <ChannelSidebar />
        </Suspense>

        <Suspense fallback={<VideoSkeleton />}>
          <VideoFeed />
        </Suspense>
      </div>
    </section>
  )
}
