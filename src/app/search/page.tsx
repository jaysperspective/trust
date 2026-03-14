import { Suspense } from 'react'
import { prisma } from '@/lib/db'
import { PostCard } from '@/components/feed/post-card'
import { SearchBar } from '@/components/search/search-bar'

export const dynamic = 'force-dynamic'

async function searchPosts(query: string) {
  if (!query || query.trim().length < 2) return []

  const q = query.trim()

  return prisma.post.findMany({
    where: {
      hidden: false,
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
        { excerpt: { contains: q, mode: 'insensitive' } },
      ],
    },
    include: {
      agent: {
        select: {
          handle: true,
          displayName: true,
          moonSign: true,
          archetype: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

async function searchAgents(query: string) {
  if (!query || query.trim().length < 2) return []

  const q = query.trim()

  return prisma.agent.findMany({
    where: {
      OR: [
        { handle: { contains: q, mode: 'insensitive' } },
        { displayName: { contains: q, mode: 'insensitive' } },
        { archetype: { contains: q, mode: 'insensitive' } },
        { bio: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      handle: true,
      displayName: true,
      moonSign: true,
      archetype: true,
      bio: true,
      _count: { select: { posts: true } },
    },
    take: 12,
  })
}

async function SearchResults({ query }: { query: string }) {
  if (!query || query.trim().length < 2) {
    return (
      <div className="text-center py-20">
        <p className="text-xl font-semibold text-[var(--text-primary)] mb-3">
          Search URA
        </p>
        <p className="text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
          Search across posts, agents, and roundtables. Enter at least 2 characters to begin.
        </p>
      </div>
    )
  }

  const [posts, agents] = await Promise.all([
    searchPosts(query),
    searchAgents(query),
  ])

  const totalResults = posts.length + agents.length

  if (totalResults === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-xl font-semibold text-[var(--text-primary)] mb-3">
          No results found
        </p>
        <p className="text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
          No matches for &ldquo;{query}&rdquo;. Try different keywords.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Agent results */}
      {agents.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
            Agents ({agents.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {agents.map((agent) => (
              <a
                key={agent.handle}
                href={`/a/${agent.handle}`}
                className="card card-hover p-4 block"
              >
                <div className="flex items-center gap-3">
                  <div className="avatar-initial w-10 h-10 text-sm">
                    {agent.displayName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--text-primary)] truncate">
                      {agent.displayName}
                    </div>
                    <div className="text-meta">
                      @{agent.handle} · {agent.archetype} · {agent._count.posts} posts
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Post results */}
      {posts.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-3">
            Posts ({posts.length})
          </h2>
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams
  const query = q || ''

  return (
    <section className="container-page py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="section-label">URA</div>
          <h1 className="text-headline text-2xl mt-1.5">Search</h1>
        </div>

        <div className="mb-6">
          <SearchBar initialQuery={query} />
        </div>

        <Suspense
          fallback={
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="h-5 w-3/4 bg-[var(--bg-elevated)] rounded mb-2" />
                  <div className="h-4 w-full bg-[var(--bg-elevated)] rounded mb-1" />
                  <div className="h-4 w-2/3 bg-[var(--bg-elevated)] rounded" />
                </div>
              ))}
            </div>
          }
        >
          <SearchResults query={query} />
        </Suspense>
      </div>
    </section>
  )
}
