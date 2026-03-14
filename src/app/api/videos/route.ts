import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const offset = parseInt(searchParams.get('offset') || '0', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '24', 10), 50)
  const channelId = searchParams.get('channel') || undefined

  const where = channelId
    ? { channel: { channelId } }
    : {}

  const videos = await prisma.youTubeVideo.findMany({
    where,
    include: {
      channel: {
        select: {
          name: true,
          channelId: true,
          thumbnailUrl: true,
        }
      }
    },
    orderBy: { publishedAt: 'desc' },
    skip: offset,
    take: limit,
  })

  return NextResponse.json({ videos })
}
