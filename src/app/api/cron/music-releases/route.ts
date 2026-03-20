import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyCronSecret, isAdminAuthenticated } from '@/lib/auth'
import { getExcludedArtists, isExcludedArtist } from '@/lib/excluded-artists'

const ITUNES_GENRES = [
  { query: 'hip hop', label: 'hip_hop' },
  { query: 'r&b soul', label: 'rnb_soul' },
  { query: 'jazz', label: 'jazz' },
]

interface ITunesResult {
  collectionId: number
  collectionName: string
  artistName: string
  artworkUrl100: string
  collectionType: string // 'Album'
  releaseDate: string
  trackCount: number
  collectionViewUrl: string
  primaryGenreName: string
  copyright?: string
}

interface RSSAlbum {
  id: string
  name: string
  artistName: string
  artworkUrl100: string
  releaseDate: string
  url: string
  genreNames: string[]
}

async function itunesFetch(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { 'User-Agent': 'plustrust/1.0' } })
  if (!res.ok) {
    const body = await res.text()
    console.error(`[iTunes] ${res.status} ${url}:`, body)
    throw new Error(`iTunes ${res.status}`)
  }
  return res.json()
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function hiResArtwork(url100: string): string {
  // iTunes artwork URLs end in 100x100bb.jpg — replace for larger size
  return url100.replace('100x100bb', '600x600bb')
}

function guessGenre(primaryGenre: string, genreNames?: string[]): string {
  const all = [primaryGenre, ...(genreNames || [])].map(g => g.toLowerCase())
  if (all.some(g => g.includes('hip') || g.includes('rap'))) return 'hip_hop'
  if (all.some(g => g.includes('r&b') || g.includes('soul'))) return 'rnb_soul'
  if (all.some(g => g.includes('jazz'))) return 'jazz'
  return 'hip_hop'
}

async function storeRelease(
  externalId: string,
  title: string,
  artist: string,
  coverUrl: string | null,
  releaseDate: string | null,
  releaseType: string,
  genre: string,
  trackCount: number | null,
  appleUrl: string,
  isTopArtist: boolean
): Promise<boolean> {
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
      title,
      artist,
      coverUrl,
      releaseDate: releaseDate ? new Date(releaseDate) : null,
      releaseType,
      genre,
      trackCount,
      appleUrl: appleUrl,
      source: 'apple',
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
  let topStored = 0
  const errors: string[] = []

  // ── Phase 1: iTunes Search for new albums by genre ──
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
  for (const genre of ITUNES_GENRES) {
    try {
      const query = encodeURIComponent(genre.query)
      const data = await itunesFetch(
        `https://itunes.apple.com/search?term=${query}&media=music&entity=album&limit=50&country=US`
      ) as { results?: ITunesResult[] }

      const results = (data.results || []).filter(r => r.collectionType === 'Album')
      console.log(`[Music] ${genre.label}: found ${results.length} albums via iTunes search`)

      for (const album of results) {
        if (isExcludedArtist(album.artistName, excludedArtists)) continue
        if (album.releaseDate && new Date(album.releaseDate).getTime() < cutoff) continue

        try {
          const stored = await storeRelease(
            `apple_${album.collectionId}`,
            album.collectionName,
            album.artistName,
            hiResArtwork(album.artworkUrl100),
            album.releaseDate,
            'album',
            genre.label,
            album.trackCount || null,
            album.collectionViewUrl,
            false
          )
          if (stored) {
            searchStored++
            totalStored++
          }
        } catch (err) {
          console.error(`[Music] Store album ${album.collectionName}:`, err)
        }
      }

      await delay(200) // be polite to iTunes API
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[Music] Search ${genre.label}:`, err)
      errors.push(`search_${genre.label}: ${msg}`)
    }
  }

  // ── Phase 2: Apple Music RSS top/most-played albums ──
  try {
    const data = await itunesFetch(
      'https://rss.applemarketingtools.com/api/v2/us/music/most-played/100/albums.json'
    ) as { feed?: { results?: RSSAlbum[] } }

    const albums = data.feed?.results || []
    console.log(`[Music] Apple RSS: found ${albums.length} top albums`)

    for (const album of albums) {
      if (isExcludedArtist(album.artistName, excludedArtists)) continue

      const genre = guessGenre('', album.genreNames)
      // Only include genres we care about
      if (!['hip_hop', 'rnb_soul', 'jazz'].includes(genre)) continue

      try {
        const stored = await storeRelease(
          `apple_rss_${album.id}`,
          album.name,
          album.artistName,
          hiResArtwork(album.artworkUrl100),
          album.releaseDate,
          'album',
          genre,
          null,
          album.url,
          true
        )
        if (stored) {
          topStored++
          totalStored++
        }
      } catch (err) {
        console.error(`[Music] Store RSS album ${album.name}:`, err)
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Music] Apple RSS:`, err)
    errors.push(`apple_rss: ${msg}`)
  }

  return NextResponse.json({
    message: `Stored ${totalStored} new releases (${searchStored} from search, ${topStored} from top charts)`,
    stored: totalStored,
    searchStored,
    topStored,
    errors: errors.length > 0 ? errors : undefined,
  })
}
