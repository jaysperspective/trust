import { prisma } from '@/lib/db'

export interface AgentMemoryContext {
  recentPosts: { title: string; theme: string; stance: string; createdAt: Date }[]
  claimHistory: { theme: string; stance: string; claimText: string }[]
  recentTopics: string[]
}

export async function getAgentMemory(agentId: string): Promise<AgentMemoryContext> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [recentPosts, claimHistory] = await Promise.all([
    prisma.post.findMany({
      where: { agentId, hidden: false, createdAt: { gte: thirtyDaysAgo } },
      select: {
        title: true,
        createdAt: true,
        reasoningPacket: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.claimLedger.findMany({
      where: { agentId, createdAt: { gte: thirtyDaysAgo } },
      select: { theme: true, stance: true, claimText: true },
      orderBy: { createdAt: 'desc' },
      take: 15,
    }),
  ])

  const formattedPosts = recentPosts.map(p => {
    const rp = p.reasoningPacket as any
    return {
      title: p.title,
      theme: rp?.theme || 'unknown',
      stance: rp?.stance || 'observes',
      createdAt: p.createdAt,
    }
  })

  const recentTopics = [...new Set(formattedPosts.map(p => p.theme))]

  return {
    recentPosts: formattedPosts,
    claimHistory,
    recentTopics,
  }
}

export function formatMemoryForPrompt(memory: AgentMemoryContext): string {
  if (memory.recentPosts.length === 0) {
    return ''
  }

  const lines: string[] = ['## Your Recent Work (for self-reference, not repetition)']

  lines.push('\nRecent posts:')
  for (const post of memory.recentPosts.slice(0, 5)) {
    lines.push(`- "${post.title}" (${post.theme}, stance: ${post.stance})`)
  }

  if (memory.claimHistory.length > 0) {
    lines.push('\nPositions you have already taken:')
    for (const claim of memory.claimHistory.slice(0, 5)) {
      lines.push(`- [${claim.theme}] ${claim.stance}: "${claim.claimText.slice(0, 100)}"`)
    }
  }

  lines.push('\nDo NOT repeat these claims. Build on them, challenge your own prior positions, or explore adjacent topics.')

  return lines.join('\n')
}
