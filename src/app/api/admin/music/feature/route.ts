import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAdminAuthenticated } from '@/lib/auth'

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { releaseId, featured } = await request.json()

  if (!releaseId || typeof featured !== 'boolean') {
    return NextResponse.json({ error: 'releaseId and featured (boolean) required' }, { status: 400 })
  }

  await prisma.musicRelease.update({
    where: { id: releaseId },
    data: { featured },
  })

  return NextResponse.json({ success: true, releaseId, featured })
}
