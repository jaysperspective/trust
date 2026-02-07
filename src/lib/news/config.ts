import { prisma } from '@/lib/db'

export type PublisherWeight = {
  publisher: string
  weight: number
}

export type KeywordWeight = {
  keyword: string
  weight: number
}

export type CustomFeed = {
  url: string
  publisher: string
}

export type NewsConfig = {
  maxStoriesPerBatch: number
  maxPerPublisher: number
  publisherWeights: PublisherWeight[]
  keywordWeights: KeywordWeight[]
  customFeeds: CustomFeed[]
}

const DEFAULT_CONFIG: NewsConfig = {
  maxStoriesPerBatch: 22,
  maxPerPublisher: 3,
  publisherWeights: [],
  keywordWeights: [],
  customFeeds: []
}

const CONFIG_KEY = 'news_config'

export async function getNewsConfig(): Promise<NewsConfig> {
  const existing = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } })

  if (!existing) return DEFAULT_CONFIG

  const parsed = existing.value as Partial<NewsConfig>
  return {
    ...DEFAULT_CONFIG,
    ...parsed,
    publisherWeights: parsed.publisherWeights || [],
    keywordWeights: parsed.keywordWeights || [],
    customFeeds: parsed.customFeeds || []
  }
}

export async function saveNewsConfig(update: NewsConfig): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: CONFIG_KEY },
    update: { value: update },
    create: { key: CONFIG_KEY, value: update }
  })
}

export function mergeConfig(base: NewsConfig, patch: Partial<NewsConfig>): NewsConfig {
  return {
    ...base,
    ...patch,
    publisherWeights: patch.publisherWeights ?? base.publisherWeights,
    keywordWeights: patch.keywordWeights ?? base.keywordWeights,
    customFeeds: patch.customFeeds ?? base.customFeeds
  }
}
