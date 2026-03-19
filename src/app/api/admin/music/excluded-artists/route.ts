import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import { getCustomExcludedArtists, setCustomExcludedArtists } from '@/lib/excluded-artists'

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const artists = await getCustomExcludedArtists()
  return NextResponse.json({ artists })
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { artists } = await request.json()
  if (!Array.isArray(artists)) {
    return NextResponse.json({ error: 'artists must be an array' }, { status: 400 })
  }

  await setCustomExcludedArtists(artists)
  const updated = await getCustomExcludedArtists()
  return NextResponse.json({ artists: updated })
}
