import { prisma } from '@/lib/db'

const CONFIG_KEY = 'excluded_artists'

// Hardcoded defaults that are always excluded
const DEFAULT_EXCLUDED = ['disney']

export async function getExcludedArtists(): Promise<string[]> {
  const row = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } })
  const custom = Array.isArray(row?.value) ? (row.value as string[]) : []
  return [...DEFAULT_EXCLUDED, ...custom]
}

export async function getCustomExcludedArtists(): Promise<string[]> {
  const row = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } })
  return Array.isArray(row?.value) ? (row.value as string[]) : []
}

export async function setCustomExcludedArtists(artists: string[]): Promise<void> {
  const cleaned = artists
    .map(a => a.trim().toLowerCase())
    .filter(a => a.length > 0)
  const unique = [...new Set(cleaned)]

  await prisma.systemConfig.upsert({
    where: { key: CONFIG_KEY },
    update: { value: unique },
    create: { key: CONFIG_KEY, value: unique },
  })
}

export function isExcludedArtist(name: string, excludedList: string[]): boolean {
  return excludedList.includes(name.toLowerCase())
}
