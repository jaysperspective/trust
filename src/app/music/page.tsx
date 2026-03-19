import { Suspense } from 'react'
import { prisma } from '@/lib/db'
import { PlusRating } from './rating'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Music | plustrust',
  description: 'New hip hop, R&B, and soul releases — rate albums and singles from + to +++++.',
}

const GENRE_LABELS: Record<string, string> = {
  hip_hop: 'Hip Hop',
  rnb: 'R&B',
  soul: 'Soul',
}

const RELEASE_TYPE_LABELS: Record<string, string> = {
  album: 'Album',
  single: 'Single',
  ep: 'EP',
}

type ReleaseWithRating = {
  id: string
  title: string
  artist: string
  coverUrl: string | null
  releaseDate: Date | null
  releaseType: string
  genre: string | null
  deezerUrl: string | null
  topArtist: boolean
  featured: boolean
  avgRating: number
  ratingCount: number
}

async function getReleases(genre?: string): Promise<{
  featured: ReleaseWithRating[]
  topArtist: ReleaseWithRating[]
  all: ReleaseWithRating[]
}> {
  try {
    const where: Record<string, unknown> = {}
    if (genre && genre !== 'all') {
      where.genre = genre
    }

    const releases = await prisma.musicRelease.findMany({
      where,
      include: {
        ratings: {
          select: { rating: true },
        },
      },
      orderBy: [
        { featured: 'desc' },
        { releaseDate: 'desc' },
      ],
      take: 200,
    })

    const mapped = releases.map(r => {
      const ratings = r.ratings
      const avgRating = ratings.length > 0
        ? ratings.reduce((sum, rt) => sum + rt.rating, 0) / ratings.length
        : 0
      return {
        id: r.id,
        title: r.title,
        artist: r.artist,
        coverUrl: r.coverUrl,
        releaseDate: r.releaseDate,
        releaseType: r.releaseType,
        genre: r.genre,
        deezerUrl: r.deezerUrl,
        topArtist: r.topArtist,
        featured: r.featured,
        avgRating,
        ratingCount: ratings.length,
      }
    })

    return {
      featured: mapped.filter(r => r.featured),
      topArtist: mapped.filter(r => r.topArtist && !r.featured),
      all: mapped.filter(r => !r.topArtist && !r.featured),
    }
  } catch {
    return { featured: [], topArtist: [], all: [] }
  }
}

function ReleaseSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <div key={i} className="animate-pulse">
          <div className="aspect-square bg-[var(--bg-elevated)] rounded-lg mb-2" />
          <div className="h-4 w-3/4 bg-[var(--bg-elevated)] rounded mb-1" />
          <div className="h-3 w-1/2 bg-[var(--bg-elevated)] rounded" />
        </div>
      ))}
    </div>
  )
}

function ReleaseCard({ release, size = 'normal' }: { release: ReleaseWithRating; size?: 'featured' | 'normal' }) {
  const isFeatured = size === 'featured'

  return (
    <div className="group">
      <a
        href={release.deezerUrl || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="block aspect-square rounded-lg overflow-hidden bg-[var(--bg-elevated)] mb-2 relative"
      >
        {release.coverUrl ? (
          <img
            src={release.coverUrl}
            alt={`${release.title} by ${release.artist}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
        )}
        <span className="absolute top-2 right-2 text-[10px] font-semibold uppercase tracking-wider bg-black/60 text-white px-1.5 py-0.5 rounded">
          {RELEASE_TYPE_LABELS[release.releaseType] || release.releaseType}
        </span>
        {isFeatured && (
          <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-primary)] text-white px-2 py-0.5 rounded">
            Featured
          </span>
        )}
      </a>

      <h3 className={`font-semibold text-[var(--text-primary)] line-clamp-1 ${isFeatured ? 'text-base' : 'text-sm'}`}>
        {release.title}
      </h3>
      <p className="text-xs text-[var(--text-muted)] line-clamp-1 mb-0.5">
        {release.artist}
      </p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-[var(--text-muted)]">
          {release.releaseDate
            ? new Date(release.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : ''}
          {release.genre && ` · ${GENRE_LABELS[release.genre] || release.genre}`}
        </span>
      </div>

      <div className="mt-1">
        <PlusRating
          releaseId={release.id}
          initialAverage={release.avgRating}
          initialCount={release.ratingCount}
        />
      </div>
    </div>
  )
}

async function ReleaseGrid({ genre }: { genre?: string }) {
  const { featured, topArtist, all } = await getReleases(genre)

  if (featured.length === 0 && topArtist.length === 0 && all.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-semibold text-[var(--text-primary)] mb-2">No releases yet</p>
        <p className="text-sm text-[var(--text-muted)]">
          New music will appear here once releases are fetched. Check back soon.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* Featured Releases */}
      {featured.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-[var(--accent-primary)] mb-4 uppercase tracking-wide">Featured</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {featured.map(release => (
              <ReleaseCard key={release.id} release={release} size="featured" />
            ))}
          </div>
        </section>
      )}

      {/* Top Artists */}
      {topArtist.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 uppercase tracking-wide">Top Artists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {topArtist.map(release => (
              <ReleaseCard key={release.id} release={release} />
            ))}
          </div>
        </section>
      )}

      {/* All Releases */}
      {all.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 uppercase tracking-wide">All Releases</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {all.map(release => (
              <ReleaseCard key={release.id} release={release} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

interface PageProps {
  searchParams: Promise<{ genre?: string }>
}

export default async function MusicPage({ searchParams }: PageProps) {
  const { genre } = await searchParams

  return (
    <section className="container-page py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <div className="section-label">+trust</div>
          <h1 className="text-headline text-2xl mt-1.5">Music</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">New releases in hip hop, R&B, and soul. Rate from + to +++++.</p>
        </div>

        {/* Genre filters */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {[
            { value: 'all', label: 'All' },
            { value: 'hip_hop', label: 'Hip Hop' },
            { value: 'rnb', label: 'R&B' },
            { value: 'soul', label: 'Soul' },
          ].map(filter => {
            const isActive = (genre || 'all') === filter.value
            return (
              <a
                key={filter.value}
                href={filter.value === 'all' ? '/music' : `/music?genre=${filter.value}`}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                  isActive
                    ? 'bg-[var(--accent-primary)] text-white font-semibold'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {filter.label}
              </a>
            )
          })}
        </div>

        <Suspense fallback={<ReleaseSkeleton />}>
          <ReleaseGrid genre={genre} />
        </Suspense>
      </div>
    </section>
  )
}
