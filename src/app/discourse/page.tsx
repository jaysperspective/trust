import { Suspense } from 'react'
import { prisma } from '@/lib/db'
import { InstagramFeed } from './instagram-feed'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '+Feed | plustrust',
  description: 'The latest from plustrust — YouTube videos and Instagram posts.',
}

const PLUSNTRUST_CHANNEL_ID = 'UCPx8Jwbky3uQXqLmBe74r2A'

async function getInstagramPosts() {
  try {
    return await prisma.instagramPost.findMany({
      orderBy: { timestamp: 'desc' },
      take: 12,
    })
  } catch {
    return []
  }
}

async function getYouTubeVideos() {
  try {
    return await prisma.youTubeVideo.findMany({
      where: {
        channel: { channelId: PLUSNTRUST_CHANNEL_ID },
      },
      orderBy: { publishedAt: 'desc' },
      take: 12,
    })
  } catch {
    return []
  }
}

function InstagramSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="aspect-square bg-[var(--bg-elevated)] animate-pulse" />
      ))}
    </div>
  )
}

async function InstagramSection() {
  const posts = await getInstagramPosts()
  return <InstagramFeed posts={posts} />
}

function VideoSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="animate-pulse">
          <div className="aspect-video bg-[var(--bg-elevated)] rounded-lg mb-2" />
          <div className="h-4 w-3/4 bg-[var(--bg-elevated)] rounded mb-1" />
          <div className="h-3 w-1/2 bg-[var(--bg-elevated)] rounded" />
        </div>
      ))}
    </div>
  )
}

async function YouTubeSection() {
  const videos = await getYouTubeVideos()

  if (videos.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-[var(--text-muted)]">No videos yet. Check back soon.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {videos.map(video => (
        <a
          key={video.id}
          href={`https://www.youtube.com/watch?v=${video.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group block"
        >
          <div className="aspect-video rounded-lg overflow-hidden bg-[var(--bg-elevated)] mb-2">
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </div>
            )}
          </div>
          <h3 className="text-sm font-medium text-[var(--text-primary)] line-clamp-2 group-hover:text-[var(--accent-primary)] transition-colors">
            {video.title}
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {video.publishedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {video.viewCount != null && ` · ${video.viewCount.toLocaleString()} views`}
          </p>
        </a>
      ))}
    </div>
  )
}

export default function FeedPage() {
  return (
    <section className="container-page py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="section-label">+trust</div>
          <h1 className="text-headline text-2xl mt-1.5">+Feed</h1>
        </div>

        {/* Instagram Section */}
        <div className="mb-12">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            Instagram
          </h2>
          <Suspense fallback={<InstagramSkeleton />}>
            <InstagramSection />
          </Suspense>
        </div>

        {/* YouTube Section */}
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            YouTube
          </h2>
          <Suspense fallback={<VideoSkeleton />}>
            <YouTubeSection />
          </Suspense>
        </div>
      </div>
    </section>
  )
}
