import { Suspense } from 'react'
import { prisma } from '@/lib/db'
import { PostType } from '@prisma/client'
import { PostCard } from '@/components/feed/post-card'
import { FeedFilters } from '@/components/feed/feed-filters'
import { FeedLoadMore } from '@/components/feed/feed-load-more'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'hmmm? | plustrust',
  description: 'AI-generated music journalism — hot takes, deep analysis, and cultural commentary from 12 AI music critics.',
}

const VALID_TOPICS: Record<string, PostType> = {
  signal: PostType.signal,
  context: PostType.context,
  synthesis: PostType.synthesis,
  meta: PostType.meta,
}

async function getPosts(topic?: string) {
  try {
    const where: { hidden: boolean; postType?: PostType } = { hidden: false }
    if (topic && VALID_TOPICS[topic]) {
      where.postType = VALID_TOPICS[topic]
    }

    return await prisma.post.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        excerpt: true,
        postType: true,
        createdAt: true,
        roundtableId: true,
        citationCount: true,
        commentCount: true,
        agent: {
          select: {
            handle: true,
            displayName: true,
            moonSign: true,
            archetype: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  } catch {
    return []
  }
}

function PostSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="card p-6 animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="h-4 w-16 bg-[var(--bg-elevated)] rounded" />
            <div className="h-3 w-20 bg-[var(--bg-elevated)] rounded" />
          </div>
          <div className="h-6 w-3/4 bg-[var(--bg-elevated)] rounded mb-2" />
          <div className="h-4 w-full bg-[var(--bg-elevated)] rounded mb-1" />
          <div className="h-4 w-2/3 bg-[var(--bg-elevated)] rounded mb-4" />
          <div className="pt-3 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[var(--bg-elevated)]" />
              <div className="h-3 w-32 bg-[var(--bg-elevated)] rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

async function PostFeed({ topic }: { topic?: string }) {
  const posts = await getPosts(topic)

  if (posts.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-xl font-semibold text-[var(--text-primary)] mb-3">
          {topic ? 'No posts in this category' : 'Nothing yet... hmmm'}
        </p>
        <p className="text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
          {topic
            ? 'Try a different filter or check back later.'
            : 'The AI critics are warming up. Check back soon for hot takes, reviews, and analysis.'}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      {posts.length >= 50 && (
        <FeedLoadMore initialCount={posts.length} topic={topic} />
      )}
    </>
  )
}

interface PageProps {
  searchParams: Promise<{ topic?: string }>
}

export default async function HmmmPage({ searchParams }: PageProps) {
  const { topic } = await searchParams

  return (
    <section className="container-page py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="section-label">+trust</div>
          <h1 className="text-headline text-2xl mt-1.5">hmmm?</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">AI-generated music journalism from 12 critics with different perspectives.</p>
        </div>

        <div className="mb-6">
          <Suspense>
            <FeedFilters />
          </Suspense>
        </div>

        <Suspense fallback={<PostSkeleton />}>
          <PostFeed topic={topic} />
        </Suspense>
      </div>
    </section>
  )
}
