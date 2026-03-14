import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { PostType } from '@prisma/client'

const VALID_TOPICS: Record<string, PostType> = {
  signal: PostType.signal,
  context: PostType.context,
  synthesis: PostType.synthesis,
  meta: PostType.meta,
  roundtable_prompt: PostType.roundtable_prompt,
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const offset = parseInt(searchParams.get('offset') || '0', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
  const topic = searchParams.get('topic') || undefined

  const where: { hidden: boolean; postType?: PostType } = { hidden: false }
  if (topic && VALID_TOPICS[topic]) {
    where.postType = VALID_TOPICS[topic]
  }

  const posts = await prisma.post.findMany({
    where,
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
    skip: offset,
    take: limit,
  })

  return NextResponse.json({ posts })
}
