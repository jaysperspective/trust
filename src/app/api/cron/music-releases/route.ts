import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyCronSecret, isAdminAuthenticated } from '@/lib/auth'
import { getExcludedArtists, isExcludedArtist } from '@/lib/excluded-artists'

const DEEZER_GENRES = [
  { id: 116, label: 'hip_hop' },
  { id: 165, label: 'rnb' },
  { id: 169, label: 'soul' },
]

interface DeezerArtist {
  id: number
  name: string
  position?: number
}

interface DeezerAlbum {
  id: number
  title: string
  link?: string
  cover_big?: string
  cover_xl?: string
  record_type?: string
  type?: string
  release_date?: string
  genre_id?: number
  artist?: { name: string }
  nb_tracks?: number
  label?: string
  explicit_lyrics?: boolean
}

async function deezerFetch(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { 'User-Agent': 'plustrust/1.0' } })
  if (!res.ok) throw new Error(`Deezer ${res.status}`)
  return res.json()
}

// Small delay to respect Deezer rate limits (50 req / 5 sec)
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function storeRelease(
  album: DeezerAlbum,
  artistName: string,
  genre: string,
  isTopArtist: boolean
): Promise<boolean> {
  const externalId = `deezer_${album.id}`

  const existing = await prisma.musicRelease.findUnique({
    where: { externalId },
    select: { id: true, topArtist: true },
  })

  if (existing) {
    // If already exists but now from a top artist, upgrade it
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
      title: album.title,
      artist: artistName,
      coverUrl: album.cover_big || album.cover_xl || null,
      releaseDate: album.release_date ? new Date(album.release_date) : null,
      releaseType: album.record_type || album.type || 'album',
      genre,
      label: album.label || null,
      trackCount: album.nb_tracks || null,
      deezerUrl: album.link || `https://www.deezer.com/album/${album.id}`,
      source: 'deezer',
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
  let topArtistStored = 0
  let editorialStored = 0
  const errors: string[] = []

  // ── Phase 1: Top 100 Artists per genre → their latest releases ──
  for (const genre of DEEZER_GENRES) {
    try {
      const chartData = await deezerFetch(
        `https://api.deezer.com/chart/${genre.id}/artists?limit=100`
      ) as { data?: DeezerArtist[] }

      const artists = chartData.data || []
      console.log(`[Music] ${genre.label}: found ${artists.length} top artists`)

      for (const artist of artists) {
        if (isExcludedArtist(artist.name, excludedArtists)) continue
        try {
          await delay(120) // ~8 req/sec, safely under 50/5sec limit
          const albumData = await deezerFetch(
            `https://api.deezer.com/artist/${artist.id}/albums?limit=5&order=RELEASE_DATE`
          ) as { data?: DeezerAlbum[] }

          const albums = albumData.data || []

          // Only recent releases (last 90 days)
          const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
          for (const album of albums) {
            if (album.release_date && new Date(album.release_date).getTime() < cutoff) continue

            const stored = await storeRelease(album, artist.name, genre.label, true)
            if (stored) {
              topArtistStored++
              totalStored++
            }
          }
        } catch (err) {
          // Skip individual artist errors silently
          console.error(`[Music] Artist ${artist.name} error:`, err)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[Music] Top artists ${genre.label}:`, err)
      errors.push(`top_artists_${genre.label}: ${msg}`)
    }
  }

  // ── Phase 2: Editorial new releases (all releases feed) ──
  for (const genre of DEEZER_GENRES) {
    try {
      const data = await deezerFetch(
        `https://api.deezer.com/editorial/${genre.id}/releases?limit=50`
      ) as { data?: DeezerAlbum[] }

      const albums = data.data || []

      for (const album of albums) {
        const artistName = album.artist?.name || 'Unknown'
        if (isExcludedArtist(artistName, excludedArtists)) continue
        try {
          const stored = await storeRelease(
            album,
            artistName,
            genre.label,
            false
          )
          if (stored) {
            editorialStored++
            totalStored++
          }
        } catch (err) {
          console.error(`[Music] Store album ${album.title}:`, err)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[Music] Editorial ${genre.label}:`, err)
      errors.push(`editorial_${genre.label}: ${msg}`)
    }
  }

  return NextResponse.json({
    message: `Stored ${totalStored} new releases (${topArtistStored} from top artists, ${editorialStored} from editorial)`,
    stored: totalStored,
    topArtistStored,
    editorialStored,
    errors: errors.length > 0 ? errors : undefined,
  })
}
