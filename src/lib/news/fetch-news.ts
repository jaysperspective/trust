import { prisma } from '@/lib/db'
import { RSSProvider } from '@/lib/sources/rss'
import { getNewsConfig } from './config'

export const NEWS_SLOTS = {
  morning:   { hour: 7,  label: 'Morning Edition / 7 AM',    slot: 'morning'   },
  midday:    { hour: 13, label: 'Midday Edition / 1 PM',     slot: 'midday'    },
  afternoon: { hour: 17, label: 'Afternoon Edition / 5 PM',  slot: 'afternoon' },
  evening:   { hour: 22, label: 'Evening Edition / 10 PM',   slot: 'evening'   },
} as const

export type NewsSlot = keyof typeof NEWS_SLOTS

export async function fetchAndStoreNews(slot: NewsSlot): Promise<{
  fetched: number
  stored: number
  duplicates: number
  skippedByCap: number
}> {
  const slotConfig = NEWS_SLOTS[slot]
  const batchTime = new Date()

  const config = await getNewsConfig()

  const provider = new RSSProvider(config.customFeeds)
  // Fetch recent stories (already filtered to last 7 days, sorted newest first)
  const allItems = await provider.fetchAll(200)

  // Deduplicate against what's already in the database, then cap at limit
  let stored = 0
  let duplicates = 0
  let skippedByCap = 0
  const perPublisherCount: Record<string, number> = {}

  // Compute weighted ordering
  const SUBSTACK_PRIORITY_BOOST = 10
  const scored = allItems.map(item => {
    const publisherWeight = config.publisherWeights.find(p => p.publisher.toLowerCase() === (item.publisher || '').toLowerCase())
    const keywordScore = config.keywordWeights.reduce((score, kw) => {
      const haystack = `${item.title} ${item.snippet}`.toLowerCase()
      return haystack.includes(kw.keyword.toLowerCase()) ? score + kw.weight : score
    }, 0)
    const substackBoost = item.metadata?.substack ? SUBSTACK_PRIORITY_BOOST : 0
    return {
      ...item,
      score: (publisherWeight?.weight || 0) + keywordScore + substackBoost
    }
  })

  // Sort by (higher score, newer publishedAt)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
    const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
    return dateB - dateA
  })

  for (const item of scored) {
    if (!item.url) continue
    if (stored >= config.maxStoriesPerBatch) break

    // Check if this URL already exists
    const existing = await prisma.newsStory.findUnique({
      where: { url: item.url },
      select: { id: true }
    })

    if (existing) {
      duplicates++
      continue
    }

    const publisherKey = (item.publisher || 'Unknown').toLowerCase()
    const count = perPublisherCount[publisherKey] || 0
    if (count >= config.maxPerPublisher) {
      skippedByCap++
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
      perPublisherCount[publisherKey] = count + 1
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
    fetched: scored.length,
    stored,
    duplicates,
    skippedByCap,
  }
}
