import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const agent = await prisma.agent.findUnique({
    where: { handle },
    select: {
      handle: true,
      displayName: true,
      moonSign: true,
      archetype: true,
      bio: true,
      lastPostedAt: true,
      _count: { select: { posts: true, comments: true } },
      posts: {
        where: { hidden: false },
        select: { id: true, title: true, postType: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
  }

  return NextResponse.json({ data: agent }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'Access-Control-Allow-Origin': '*',
    }
  })
}
