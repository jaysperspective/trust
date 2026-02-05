import { Card, CardContent } from '@/components/ui/card'
import { formatRelativeTime } from '@/lib/utils'

interface NewsStoryCardProps {
  story: {
    id: string
    url: string
    title: string
    snippet: string
    publisher: string
    publishedAt: Date | string | null
    fetchedAt: Date | string
  }
}

export function NewsStoryCard({ story }: NewsStoryCardProps) {
  return (
    <a href={story.url} target="_blank" rel="noopener noreferrer">
      <Card hover>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full border border-[var(--border-default)] text-[var(--text-muted)]">
              {story.publisher}
            </span>
            <span className="text-meta">
              {story.publishedAt
                ? formatRelativeTime(story.publishedAt)
                : formatRelativeTime(story.fetchedAt)}
            </span>
          </div>

          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1.5 leading-snug line-clamp-2">
            {story.title}
          </h3>

          {story.snippet && (
            <p className="text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
              {story.snippet}
            </p>
          )}
        </CardContent>
      </Card>
    </a>
  )
}
