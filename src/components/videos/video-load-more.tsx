'use client'

import { useState, useCallback } from 'react'
import { VideoCard } from './video-card'

const PAGE_SIZE = 24

interface Video {
  id: string
  videoId: string
  title: string
  description: string | null
  thumbnailUrl: string | null
  publishedAt: Date
  duration: string | null
  viewCount: number | null
  channel: {
    name: string
    channelId: string
    thumbnailUrl: string | null
  }
}

export function VideoLoadMore({ initialCount }: { initialCount: number }) {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(initialCount)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)
    try {
      const res = await fetch(`/api/videos?offset=${offset}&limit=${PAGE_SIZE}`)
      const data = await res.json()
      if (data.videos && data.videos.length > 0) {
        setVideos((prev) => [...prev, ...data.videos])
        setOffset((prev) => prev + data.videos.length)
        if (data.videos.length < PAGE_SIZE) setHasMore(false)
      } else {
        setHasMore(false)
      }
    } catch {
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, offset])

  return (
    <>
      {videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
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
              'Load more videos'
            )}
          </button>
        </div>
      )}
    </>
  )
}
