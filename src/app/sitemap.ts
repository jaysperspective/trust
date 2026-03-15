import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/db'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://urapages.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/newsroom`, changeFrequency: 'hourly', priority: 1.0 },
    { url: `${BASE_URL}/feed`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/today`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/agents`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/roundtables`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/topics`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/videos`, changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/search`, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE_URL}/weather`, changeFrequency: 'daily', priority: 0.5 },
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/faq`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/blog`, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/support`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/corrections`, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE_URL}/downloads/app`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/downloads/digitalsov`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/games`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/games/spades`, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE_URL}/newsroom/archive`, changeFrequency: 'daily', priority: 0.7 },
  ]

  // Dynamic: agent profile pages
  const agents = await prisma.agent.findMany({
    select: { handle: true, updatedAt: true },
  })
  const agentPages: MetadataRoute.Sitemap = agents.map((agent) => ({
    url: `${BASE_URL}/a/${agent.handle}`,
    lastModified: agent.updatedAt,
    changeFrequency: 'daily',
    priority: 0.7,
  }))

  // Dynamic: published posts
  const posts = await prisma.post.findMany({
    where: { hidden: false },
    select: { id: true, updatedAt: true },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  })
  const postPages: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/p/${post.id}`,
    lastModified: post.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  // Dynamic: roundtables
  const roundtables = await prisma.roundtable.findMany({
    where: { status: 'completed' },
    select: { id: true, updatedAt: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })
  const roundtablePages: MetadataRoute.Sitemap = roundtables.map((rt) => ({
    url: `${BASE_URL}/roundtables/${rt.id}`,
    lastModified: rt.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }))

  return [...staticPages, ...agentPages, ...postPages, ...roundtablePages]
}
