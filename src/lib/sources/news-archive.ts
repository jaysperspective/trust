import { prisma } from '@/lib/db'
import type { SourceProvider, SourceResult } from './types'

export class NewsArchiveProvider implements SourceProvider {
  name = 'news_archive'

  async search(query: string, limit = 5): Promise<SourceResult[]> {
    if (!query.trim()) return []

    const words = query.trim().split(/\s+/).filter(w => w.length > 2)
    if (words.length === 0) return []

    const orConditions = words.flatMap(word => [
      { title: { contains: word, mode: 'insensitive' as const } },
      { snippet: { contains: word, mode: 'insensitive' as const } },
    ])

    const stories = await prisma.newsStory.findMany({
      where: { OR: orConditions },
      orderBy: { fetchedAt: 'desc' },
      take: limit,
    })

    return stories.map(story => ({
      title: story.title,
      url: story.url,
      snippet: story.snippet,
      publisher: story.publisher,
      publishedAt: story.publishedAt || undefined,
      sourceType: 'rss' as const,
    }))
  }
}
