import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { formatRelativeTime } from '@/lib/utils'
import { VideoFetchButton } from './video-fetch-button'
import { AddChannelForm } from './add-channel-form'

export const dynamic = 'force-dynamic'

async function getVideoStats() {
  const [channels, videoCount, recentVideos] = await Promise.all([
    prisma.youTubeChannel.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { videos: true } },
      },
    }),
    prisma.youTubeVideo.count(),
    prisma.youTubeVideo.findMany({
      take: 10,
      orderBy: { fetchedAt: 'desc' },
      include: {
        channel: { select: { name: true } },
      },
    }),
  ])

  return { channels, videoCount, recentVideos }
}

export default async function AdminVideosPage() {
  const isAuthenticated = await isAdminAuthenticated()
  if (!isAuthenticated) redirect('/admin/login')

  const stats = await getVideoStats()

  return (
    <div className="container-page py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            Video Channels
          </h1>
          <VideoFetchButton />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-semibold text-[var(--accent-primary)]">
                {stats.channels.length}
              </div>
              <div className="text-meta mt-1">Channels</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-semibold text-[var(--accent-secondary)]">
                {stats.videoCount}
              </div>
              <div className="text-meta mt-1">Videos</div>
            </CardContent>
          </Card>
        </div>

        {/* Add Channel */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <h2 className="text-meta uppercase tracking-wider mb-4">Add Channel</h2>
            <AddChannelForm />
          </CardContent>
        </Card>

        {/* Channels List */}
        <Card className="mb-6">
          <CardContent className="p-5">
            <h2 className="text-meta uppercase tracking-wider mb-4">
              Subscribed Channels ({stats.channels.length})
            </h2>
            {stats.channels.length > 0 ? (
              <div className="space-y-2">
                {stats.channels.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)]"
                  >
                    <div className="flex items-center gap-3">
                      {ch.thumbnailUrl ? (
                        <img src={ch.thumbnailUrl} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-xs text-[var(--accent-primary)]">
                          {ch.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          {ch.name}
                        </div>
                        <div className="text-meta">
                          {ch.channelId} · {ch._count.videos} videos
                          {!ch.enabled && (
                            <span className="text-[var(--status-error)] ml-2">disabled</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <a
                      href={ch.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--accent-primary)] hover:underline"
                    >
                      View on YouTube
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[var(--text-muted)] text-sm">
                No channels added yet. Add a YouTube channel ID above.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Videos */}
        <Card>
          <CardContent className="p-5">
            <h2 className="text-meta uppercase tracking-wider mb-4">
              Recently Fetched Videos
            </h2>
            {stats.recentVideos.length > 0 ? (
              <div className="space-y-1">
                {stats.recentVideos.map((v) => (
                  <a
                    key={v.id}
                    href={`https://www.youtube.com/watch?v=${v.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">
                      {v.title}
                    </p>
                    <p className="text-meta mt-0.5">
                      {v.channel.name} · fetched {formatRelativeTime(v.fetchedAt)}
                    </p>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-[var(--text-muted)] text-sm">No videos fetched yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
