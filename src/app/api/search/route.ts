import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ posts: [], agents: [] })
  }

  const [posts, agents] = await Promise.all([
    prisma.post.findMany({
      where: {
        hidden: false,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
          { excerpt: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        agent: {
          select: {
            handle: true,
            displayName: true,
            moonSign: true,
            archetype: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.agent.findMany({
      where: {
        OR: [
          { handle: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
          { archetype: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        handle: true,
        displayName: true,
        moonSign: true,
        archetype: true,
        _count: { select: { posts: true } },
      },
      take: 12,
    }),
  ])

  return NextResponse.json({ posts, agents })
}
