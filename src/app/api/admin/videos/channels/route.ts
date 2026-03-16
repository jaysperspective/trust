import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  const isAuth = await isAdminAuthenticated()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { channelId, name } = body

  if (!channelId || !name) {
    return NextResponse.json(
      { error: 'channelId and name are required' },
      { status: 400 }
    )
  }

  // Check for duplicate
  const existing = await prisma.youTubeChannel.findUnique({
    where: { channelId },
  })

  if (existing) {
    return NextResponse.json(
      { error: 'Channel already exists' },
      { status: 409 }
    )
  }

  const channel = await prisma.youTubeChannel.create({
    data: {
      channelId,
      name,
      url: `https://www.youtube.com/channel/${channelId}`,
    },
  })

  return NextResponse.json({ channel })
}

export async function PATCH(request: NextRequest) {
  const isAuth = await isAdminAuthenticated()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { id, maxResults, enabled } = body

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (typeof maxResults === 'number') {
    data.maxResults = Math.max(1, Math.min(50, maxResults))
  }
  if (typeof enabled === 'boolean') {
    data.enabled = enabled
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const channel = await prisma.youTubeChannel.update({
    where: { id },
    data,
  })

  return NextResponse.json({ channel })
}

export async function GET() {
  const isAuth = await isAdminAuthenticated()
  if (!isAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const channels = await prisma.youTubeChannel.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { videos: true } },
    },
  })

  return NextResponse.json({ channels })
}
