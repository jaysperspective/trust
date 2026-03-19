import { redirect } from 'next/navigation'
import { isAdminAuthenticated } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ExcludedArtists } from './excluded-artists'
import { AddReleaseForm } from './add-release-form'
import { ReleaseList } from './release-list'
import { MusicFetchButton } from '../music-fetch-button'

export const dynamic = 'force-dynamic'

export default async function AdminMusicPage() {
  if (!(await isAdminAuthenticated())) redirect('/admin/login')

  const releases = await prisma.musicRelease.findMany({
    orderBy: [
      { featured: 'desc' },
      { releaseDate: 'desc' },
    ],
    take: 200,
    include: {
      _count: { select: { ratings: true } },
    },
  })

  const featuredCount = releases.filter(r => r.featured).length
  const topArtistCount = releases.filter(r => r.topArtist).length

  const serialized = releases.map(r => ({
    id: r.id,
    title: r.title,
    artist: r.artist,
    coverUrl: r.coverUrl,
    releaseDate: r.releaseDate?.toISOString() || null,
    genre: r.genre,
    releaseType: r.releaseType,
    topArtist: r.topArtist,
    featured: r.featured,
    ratingCount: r._count.ratings,
  }))

  return (
    <div className="container-page py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Music Releases</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {releases.length} releases · {featuredCount} featured · {topArtistCount} from top artists
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AddReleaseForm />
            <MusicFetchButton />
          </div>
        </div>

        <ExcludedArtists />

        <ReleaseList releases={serialized} />
      </div>
    </div>
  )
}
