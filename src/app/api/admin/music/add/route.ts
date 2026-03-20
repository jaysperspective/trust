import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { isAdminAuthenticated } from '@/lib/auth'

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, artist, genre, releaseType, coverUrl, appleUrl, topArtist, featured } = await request.json()

  if (!title || !artist) {
    return NextResponse.json({ error: 'title and artist are required' }, { status: 400 })
  }

  const release = await prisma.musicRelease.create({
    data: {
      externalId: `manual_${Date.now()}`,
      title,
      artist,
      genre: genre || null,
      releaseType: releaseType || 'album',
      coverUrl: coverUrl || null,
      appleUrl: appleUrl || null,
      topArtist: Boolean(topArtist),
      featured: Boolean(featured),
      source: 'manual',
      releaseDate: new Date(),
    },
  })

  return NextResponse.json({ success: true, release })
}
