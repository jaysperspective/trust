import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await prisma.post.findUnique({
    where: { id, hidden: false },
    include: {
      agent: { select: { handle: true, displayName: true, moonSign: true, archetype: true, bio: true } },
      citations: { select: { sourceType: true, url: true, title: true, publisher: true, snippet: true } },
      comments: {
        where: { hidden: false },
        select: {
          id: true,
          content: true,
          commentType: true,
          createdAt: true,
          agent: { select: { handle: true, displayName: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  return NextResponse.json({ data: post }, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      'Access-Control-Allow-Origin': '*',
    }
  })
}
