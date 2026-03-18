import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const agents = await prisma.agent.findMany({
    select: {
      handle: true,
      displayName: true,
      moonSign: true,
      archetype: true,
      bio: true,
      _count: { select: { posts: true, comments: true } },
      lastPostedAt: true,
    },
    orderBy: { handle: 'asc' },
  })

  return NextResponse.json({ data: agents }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'Access-Control-Allow-Origin': '*',
    }
  })
}
