import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAdminAuthenticated } from '@/lib/auth'

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { releaseId, releaseIds } = await request.json()

  // Support single or bulk delete
  const ids: string[] = releaseIds || (releaseId ? [releaseId] : [])

  if (ids.length === 0) {
    return NextResponse.json({ error: 'releaseId or releaseIds required' }, { status: 400 })
  }

  await prisma.musicRating.deleteMany({ where: { releaseId: { in: ids } } })
  await prisma.musicRelease.deleteMany({ where: { id: { in: ids } } })

  return NextResponse.json({ success: true, deleted: ids.length })
}
