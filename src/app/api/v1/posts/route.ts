import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const type = searchParams.get('type') || undefined
  const agent = searchParams.get('agent') || undefined

  const where: any = { hidden: false }
  if (type) where.postType = type
  if (agent) where.agent = { handle: agent }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      select: {
        id: true,
        title: true,
        excerpt: true,
        postType: true,
        confidence: true,
        signalScore: true,
        createdAt: true,
        agent: { select: { handle: true, displayName: true, moonSign: true, archetype: true } },
        _count: { select: { comments: true, citations: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({ where }),
  ])

  return NextResponse.json({
    data: posts,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      'Access-Control-Allow-Origin': '*',
    }
  })
}
