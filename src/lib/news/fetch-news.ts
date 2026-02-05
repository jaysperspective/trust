import { prisma } from '@/lib/db'
import { RSSProvider } from '@/lib/sources/rss'

const MAX_STORIES_PER_BATCH = 13

export const NEWS_SLOTS = {
  morning:   { hour: 11, label: 'Morning Edition / 11 AM',   slot: 'morning'   },
  afternoon: { hour: 16, label: 'Afternoon Edition / 4 PM',  slot: 'afternoon' },
  evening:   { hour: 22, label: 'Evening Edition / 10 PM',   slot: 'evening'   },
} as const

export type NewsSlot = keyof typeof NEWS_SLOTS

export async function fetchAndStoreNews(slot: NewsSlot): Promise<{
  fetched: number
  stored: number
  duplicates: number
}> {
  const slotConfig = NEWS_SLOTS[slot]
  const batchTime = new Date()

  const provider = new RSSProvider()
  // Fetch recent stories (already filtered to last 7 days, sorted newest first)
  const allItems = await provider.fetchAll(100)

  // Deduplicate against what's already in the database, then cap at 13
  let stored = 0
  let duplicates = 0

  for (const item of allItems) {
    if (!item.url) continue
    if (stored >= MAX_STORIES_PER_BATCH) break

    // Check if this URL already exists
    const existing = await prisma.newsStory.findUnique({
      where: { url: item.url },
      select: { id: true }
    })

    if (existing) {
      duplicates++
      continue
    }

    try {
      await prisma.newsStory.create({
        data: {
          url: item.url,
          title: item.title,
          snippet: item.snippet,
          publisher: item.publisher || 'Unknown',
          publishedAt: item.publishedAt || null,
          batchSlot: slotConfig.slot,
          batchTime,
        }
      })
      stored++
    } catch (error) {
      const prismaError = error as { code?: string }
      if (prismaError.code === 'P2002') {
        duplicates++
      } else {
        console.error(`Failed to store story: ${item.url}`, error)
      }
    }
  }

  return {
    fetched: allItems.length,
    stored,
    duplicates,
  }
}
