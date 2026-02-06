import { prisma } from '@/lib/db'
import type { Confidence } from '@prisma/client'
import type { LedgerCheckResult } from './types'

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
  'because', 'but', 'and', 'or', 'if', 'while', 'that', 'this', 'what',
  'which', 'who', 'whom', 'these', 'those', 'it', 'its',
])

const OPPOSING_STANCES: [string, string][] = [
  ['supports', 'opposes'],
  ['affirms', 'denies'],
  ['optimistic', 'pessimistic'],
  ['rising', 'declining'],
  ['growing', 'shrinking'],
  ['strengthening', 'weakening'],
]

export function tokenize(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
  return new Set(words)
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  if (a.size === 0 || b.size === 0) return 0

  let intersection = 0
  for (const token of a) {
    if (b.has(token)) intersection++
  }

  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

export function isContradictoryStance(stanceA: string, stanceB: string): boolean {
  const a = stanceA.toLowerCase()
  const b = stanceB.toLowerCase()
  if (a === b) return false

  for (const [left, right] of OPPOSING_STANCES) {
    if ((a === left && b === right) || (a === right && b === left)) {
      return true
    }
  }
  return false
}

const DUPLICATE_THRESHOLD = 0.6

export async function checkClaimLedger(
  topicFingerprint: string,
  claimText: string,
  stance: string
): Promise<LedgerCheckResult> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const existingEntries = await prisma.claimLedger.findMany({
    where: {
      topicFingerprint,
      createdAt: { gte: thirtyDaysAgo },
    },
    select: {
      id: true,
      claimText: true,
      stance: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const claimTokens = tokenize(claimText)
  let isDuplicate = false
  let isContradiction = false
  let duplicateClaimId: string | undefined
  let contradictionClaimId: string | undefined
  let highestJaccard = 0

  for (const entry of existingEntries) {
    const entryTokens = tokenize(entry.claimText)
    const similarity = jaccardSimilarity(claimTokens, entryTokens)

    if (similarity > highestJaccard) {
      highestJaccard = similarity
    }

    if (similarity >= DUPLICATE_THRESHOLD) {
      isDuplicate = true
      duplicateClaimId = entry.id
    }

    if (isContradictoryStance(stance, entry.stance)) {
      isContradiction = true
      contradictionClaimId = entry.id
    }
  }

  return {
    isDuplicate,
    isContradiction,
    duplicateClaimId,
    contradictionClaimId,
    jaccardScore: highestJaccard,
  }
}

export async function writeClaimLedger(entry: {
  claimText: string
  theme: string
  stance: string
  confidence: Confidence
  sourcesUsed: Array<{ url?: string; title: string }>
  topicFingerprint: string
  agentId: string
  postId: string
}): Promise<void> {
  await prisma.claimLedger.create({
    data: {
      claimText: entry.claimText,
      theme: entry.theme,
      stance: entry.stance,
      confidence: entry.confidence,
      sourcesUsed: entry.sourcesUsed,
      topicFingerprint: entry.topicFingerprint,
      agentId: entry.agentId,
      postId: entry.postId,
    },
  })
}
