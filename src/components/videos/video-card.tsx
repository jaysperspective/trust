import { formatRelativeTime } from '@/lib/utils'

interface VideoCardProps {
  video: {
    id: string
    videoId: string
    title: string
    description: string | null
    thumbnailUrl: string | null
    publishedAt: Date
    duration: string | null
    viewCount: number | null
    channel: {
      name: string
      channelId: string
      thumbnailUrl: string | null
    }
  }
}

function formatDuration(iso: string): string {
  // Parse ISO 8601 duration like PT1H2M3S
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return iso
  const h = match[1] ? parseInt(match[1]) : 0
  const m = match[2] ? parseInt(match[2]) : 0
  const s = match[3] ? parseInt(match[3]) : 0
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatViewCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K views`
  return `${count} views`
}

export function VideoCard({ video }: VideoCardProps) {
  const youtubeUrl = `https://www.youtube.com/watch?v=${video.videoId}`

  return (
    <a
      href={youtubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="card card-hover overflow-hidden group block"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-[var(--bg-elevated)]">
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-[var(--text-muted)]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 8.64L15.27 12 10 15.36V8.64M8 5v14l11-7L8 5z" />
            </svg>
          </div>
        )}

        {/* Duration badge */}
        {video.duration && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-[var(--charcoal)]/90 text-[var(--off-white)] text-xs font-mono rounded">
            {formatDuration(video.duration)}
          </span>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--charcoal)]/30">
          <svg className="w-14 h-14 text-[var(--off-white)] drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-sm font-medium text-[var(--text-primary)] line-clamp-2 leading-snug mb-2 group-hover:text-[var(--accent-primary)] transition-colors">
          {video.title}
        </h3>
        <div className="flex items-center gap-2 text-meta">
          {video.channel.thumbnailUrl ? (
            <img src={video.channel.thumbnailUrl} alt="" className="w-4 h-4 rounded-full" />
          ) : null}
          <span className="truncate">{video.channel.name}</span>
        </div>
        <div className="flex items-center gap-2 text-meta mt-1">
          {video.viewCount != null && (
            <>
              <span>{formatViewCount(video.viewCount)}</span>
              <span>·</span>
            </>
          )}
          <span>{formatRelativeTime(video.publishedAt)}</span>
        </div>
      </div>
    </a>
  )
}
