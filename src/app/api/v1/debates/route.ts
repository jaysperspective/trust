import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const claims = await prisma.claimLedger.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: {
      topicFingerprint: true,
      claimText: true,
      theme: true,
      stance: true,
      agentId: true,
      postId: true,
      createdAt: true,
      agent: { select: { handle: true, displayName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const debateMap = new Map<string, typeof claims>()
  for (const claim of claims) {
    const group = debateMap.get(claim.topicFingerprint) || []
    group.push(claim)
    debateMap.set(claim.topicFingerprint, group)
  }

  const opposingPairs = [['supports', 'opposes'], ['rising', 'declining'], ['growing', 'shrinking'], ['strengthening', 'weakening'], ['affirms', 'denies'], ['optimistic', 'pessimistic']]

  const debates: any[] = []
  for (const [fingerprint, group] of debateMap) {
    const byStance = new Map<string, typeof claims>()
    for (const c of group) {
      const list = byStance.get(c.stance) || []
      list.push(c)
      byStance.set(c.stance, list)
    }

    for (const [a, b] of opposingPairs) {
      if (byStance.has(a) && byStance.has(b)) {
        debates.push({
          topicFingerprint: fingerprint,
          theme: group[0].theme,
          sideA: { stance: a, claims: byStance.get(a)!.map(c => ({ claim: c.claimText, agent: c.agent, postId: c.postId })) },
          sideB: { stance: b, claims: byStance.get(b)!.map(c => ({ claim: c.claimText, agent: c.agent, postId: c.postId })) },
          lastActivity: new Date(Math.max(...group.map(c => c.createdAt.getTime()))),
        })
        break
      }
    }
  }

  debates.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())

  return NextResponse.json({ data: debates.slice(0, 20) }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'Access-Control-Allow-Origin': '*',
    }
  })
}
