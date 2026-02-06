import { prisma } from '@/lib/db'
import type { SourceResult } from '@/lib/sources/types'
import type { SignalScoreResult } from './types'

export async function computeSignalScore(
  keyTerms: string,
  theme: string,
  sources: SourceResult[]
): Promise<SignalScoreResult> {
  const now = Date.now()

  // --- RECENCY (0-30) ---
  const sourceAges = sources
    .filter(s => s.publishedAt)
    .map(s => (now - new Date(s.publishedAt!).getTime()) / (1000 * 60 * 60))
  const newestAgeHours = sourceAges.length > 0 ? Math.min(...sourceAges) : 168
  const recency = Math.round(30 * Math.max(0, 1 - newestAgeHours / 168))

  // --- MULTIPLICITY (0-30) ---
  const publishers = new Set(
    sources.map(s => s.publisher?.toLowerCase()).filter(Boolean)
  )
  const multiplicity = Math.min(30, Math.round(publishers.size * 7.5))

  // --- ASYMMETRY (0-20) ---
  const words = keyTerms.split(/\s+/).filter(w => w.length > 2)
  let hasCounterNarrative = false

  if (words.length > 0) {
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)
    const orConditions = words.flatMap(word => [
      { title: { contains: word, mode: 'insensitive' as const } },
      { snippet: { contains: word, mode: 'insensitive' as const } },
    ])

    const newsStories = await prisma.newsStory.findMany({
      where: {
        fetchedAt: { gte: sevenDaysAgo },
        OR: orConditions,
      },
      select: { title: true, snippet: true },
      take: 50,
    })

    const contrastKeywords = ['however', 'dispute', 'challenge', 'deny', 'counter', 'oppose', 'critics', 'rebut']
    hasCounterNarrative = newsStories.some(s => {
      const text = (s.title + ' ' + (s.snippet || '')).toLowerCase()
      return contrastKeywords.some(kw => text.includes(kw))
    })
  }

  const asymmetry = hasCounterNarrative ? 5 : 20

  // --- SILENCE (0-20) ---
  let existingPostsOnTopic = 0
  if (words.length > 0) {
    const twoDaysAgo = new Date(now - 48 * 60 * 60 * 1000)
    const postOrConditions = words.flatMap(word => [
      { title: { contains: word, mode: 'insensitive' as const } },
      { content: { contains: word, mode: 'insensitive' as const } },
    ])

    existingPostsOnTopic = await prisma.post.count({
      where: {
        createdAt: { gte: twoDaysAgo },
        OR: postOrConditions,
      },
    })
  }

  const silence = Math.round(20 * Math.max(0, 1 - existingPostsOnTopic / 3))

  const total = recency + multiplicity + asymmetry + silence

  return {
    total,
    recency,
    multiplicity,
    asymmetry,
    silence,
    details: {
      newestSourceAgeHours: newestAgeHours,
      distinctPublishers: publishers.size,
      totalSources: sources.length,
      hasCounterNarrative,
      existingPostsOnTopic,
    },
  }
}
