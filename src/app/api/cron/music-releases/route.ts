import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyCronSecret, isAdminAuthenticated } from '@/lib/auth'
import { getExcludedArtists, isExcludedArtist } from '@/lib/excluded-artists'

const SPOTIFY_GENRES = [
  { query: 'hip hop', label: 'hip_hop' },
  { query: 'r&b soul', label: 'rnb_soul' },
  { query: 'jazz', label: 'jazz' },
]

interface SpotifyToken {
  access_token: string
  token_type: string
  expires_in: number
}

interface SpotifyImage {
  url: string
  height: number
  width: number
}

interface SpotifyArtist {
  id: string
  name: string
}

interface SpotifyAlbum {
  id: string
  name: string
  album_type: string // album, single, compilation
  release_date: string
  release_date_precision: string
  artists: SpotifyArtist[]
  images: SpotifyImage[]
  total_tracks: number
  external_urls: { spotify: string }
}

async function getSpotifyToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set')
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    throw new Error(`Spotify auth failed: ${res.status}`)
  }

  const data = (await res.json()) as SpotifyToken
  return data.access_token
}

async function spotifyFetch(url: string, token: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '2', 10)
    await delay(retryAfter * 1000)
    return spotifyFetch(url, token)
  }
  if (!res.ok) throw new Error(`Spotify ${res.status}`)
  return res.json()
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getBestImage(images: SpotifyImage[]): string | null {
  if (!images || images.length === 0) return null
  // Prefer ~300-640px images (good quality without being huge)
  const sorted = [...images].sort((a, b) => b.height - a.height)
  return sorted.find(i => i.height >= 300 && i.height <= 640)?.url || sorted[0]?.url || null
}

async function storeRelease(
  album: SpotifyAlbum,
  genre: string,
  isTopArtist: boolean
): Promise<boolean> {
  const externalId = `spotify_${album.id}`
  const artistName = album.artists.map(a => a.name).join(', ')

  const existing = await prisma.musicRelease.findUnique({
    where: { externalId },
    select: { id: true, topArtist: true },
  })

  if (existing) {
    if (isTopArtist && !existing.topArtist) {
      await prisma.musicRelease.update({
        where: { externalId },
        data: { topArtist: true },
      })
    }
    return false
  }

  await prisma.musicRelease.create({
    data: {
      externalId,
      title: album.name,
      artist: artistName,
      coverUrl: getBestImage(album.images),
      releaseDate: album.release_date ? new Date(album.release_date) : null,
      releaseType: album.album_type === 'compilation' ? 'album' : album.album_type,
      genre,
      trackCount: album.total_tracks || null,
      spotifyUrl: album.external_urls.spotify,
      source: 'spotify',
      topArtist: isTopArtist,
    },
  })
  return true
}

export async function POST(request: NextRequest) {
  const cronHeader = request.headers.get('x-cron-secret')
  const isAuthorized = verifyCronSecret(cronHeader) || await isAdminAuthenticated()

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const excludedArtists = await getExcludedArtists()
  let totalStored = 0
  let searchStored = 0
  let newReleasesStored = 0
  const errors: string[] = []

  let token: string
  try {
    token = await getSpotifyToken()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // ── Phase 1: Search for new albums by genre ──
  const currentYear = new Date().getFullYear()
  for (const genre of SPOTIFY_GENRES) {
    try {
      // Search for recent albums in this genre
      const query = encodeURIComponent(`genre:"${genre.query}" year:${currentYear}`)
      const data = await spotifyFetch(
        `https://api.spotify.com/v1/search?q=${query}&type=album&market=US&limit=50`,
        token
      ) as { albums?: { items?: SpotifyAlbum[] } }

      const albums = data.albums?.items || []
      console.log(`[Music] ${genre.label}: found ${albums.length} albums via search`)

      // Only recent releases (last 90 days)
      const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
      for (const album of albums) {
        const artistName = album.artists.map(a => a.name).join(', ')
        if (isExcludedArtist(artistName, excludedArtists)) continue
        if (album.release_date && new Date(album.release_date).getTime() < cutoff) continue

        try {
          const stored = await storeRelease(album, genre.label, true)
          if (stored) {
            searchStored++
            totalStored++
          }
        } catch (err) {
          console.error(`[Music] Store album ${album.name}:`, err)
        }
      }

      await delay(100)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[Music] Search ${genre.label}:`, err)
      errors.push(`search_${genre.label}: ${msg}`)
    }
  }

  // ── Phase 2: Browse new releases (general feed) ──
  try {
    const data = await spotifyFetch(
      'https://api.spotify.com/v1/browse/new-releases?country=US&limit=50',
      token
    ) as { albums?: { items?: SpotifyAlbum[] } }

    const albums = data.albums?.items || []
    console.log(`[Music] New releases: found ${albums.length} albums`)

    for (const album of albums) {
      const artistName = album.artists.map(a => a.name).join(', ')
      if (isExcludedArtist(artistName, excludedArtists)) continue

      // Try to assign a genre based on our categories — default to first genre
      try {
        const stored = await storeRelease(album, 'hip_hop', false)
        if (stored) {
          newReleasesStored++
          totalStored++
        }
      } catch (err) {
        console.error(`[Music] Store new release ${album.name}:`, err)
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Music] New releases:`, err)
    errors.push(`new_releases: ${msg}`)
  }

  return NextResponse.json({
    message: `Stored ${totalStored} new releases (${searchStored} from genre search, ${newReleasesStored} from new releases)`,
    stored: totalStored,
    searchStored,
    newReleasesStored,
    errors: errors.length > 0 ? errors : undefined,
  })
}
