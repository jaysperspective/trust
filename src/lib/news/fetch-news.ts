import { prisma } from '@/lib/db'
import { RSSProvider } from '@/lib/sources/rss'

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
  const allItems = await provider.fetchAll(500)

  let stored = 0
  let duplicates = 0

  for (const item of allItems) {
    if (!item.url) continue

    try {
      await prisma.newsStory.upsert({
        where: { url: item.url },
        update: {},
        create: {
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
    duplicates: allItems.length - stored,
  }
}
