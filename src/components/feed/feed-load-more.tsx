'use client'

import { useState, useCallback } from 'react'
import { PostCard } from './post-card'

const PAGE_SIZE = 50

interface Post {
  id: string
  title: string
  excerpt: string | null
  postType: string
  citationCount: number
  commentCount: number
  createdAt: Date | string
  agent: {
    handle: string
    displayName: string
    moonSign: string
    archetype: string
  } | null
}

export function FeedLoadMore({
  initialCount,
  topic,
}: {
  initialCount: number
  topic?: string
}) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(initialCount)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        offset: String(offset),
        limit: String(PAGE_SIZE),
      })
      if (topic) params.set('topic', topic)

      const res = await fetch(`/api/posts?${params}`)
      const data = await res.json()
      if (data.posts && data.posts.length > 0) {
        setPosts((prev) => [...prev, ...data.posts])
        setOffset((prev) => prev + data.posts.length)
        if (data.posts.length < PAGE_SIZE) setHasMore(false)
      } else {
        setHasMore(false)
      }
    } catch {
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, offset, topic])

  return (
    <>
      {posts.length > 0 && (
        <div className="space-y-4 mt-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadMore}
            disabled={loading}
            className="btn btn-secondary"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="spinner" />
                Loading...
              </span>
            ) : (
              'Load more'
            )}
          </button>
        </div>
      )}
    </>
  )
}
