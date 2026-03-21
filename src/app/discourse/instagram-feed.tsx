import type { InstagramPost } from '@prisma/client'

export function InstagramFeed({ posts }: { posts: InstagramPost[] }) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-sm text-[var(--text-muted)]">No posts yet. Check back soon.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Profile link */}
      <a
        href="https://www.instagram.com/plusntrust/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-4 rounded-lg border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-colors mb-4"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center">
          <div className="w-9 h-9 rounded-full bg-[var(--bg-surface)] flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-primary)]">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <path d="m16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
          </div>
        </div>
        <div>
          <span className="font-semibold text-[var(--text-primary)] text-sm">@plusntrust</span>
          <p className="text-xs text-[var(--text-muted)]">Follow on Instagram</p>
        </div>
        <svg className="ml-auto text-[var(--text-muted)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>

      {/* Post grid */}
      <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
        {posts.map(post => (
          <a
            key={post.id}
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative aspect-square bg-[var(--bg-elevated)] overflow-hidden"
          >
            <img
              src={post.mediaType === 'VIDEO' ? (post.thumbnailUrl || post.mediaUrl) : post.mediaUrl}
              alt={post.caption?.slice(0, 100) || 'Instagram post'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-4 text-white text-sm">
              {post.likeCount != null && (
                <span className="flex items-center gap-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                  {post.likeCount.toLocaleString()}
                </span>
              )}
              {post.commentsCount != null && (
                <span className="flex items-center gap-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  {post.commentsCount.toLocaleString()}
                </span>
              )}
            </div>

            {/* Video indicator */}
            {post.mediaType === 'VIDEO' && (
              <div className="absolute top-2 right-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white" opacity="0.8"><path d="M8 5v14l11-7z"/></svg>
              </div>
            )}

            {/* Carousel indicator */}
            {post.mediaType === 'CAROUSEL_ALBUM' && (
              <div className="absolute top-2 right-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" opacity="0.8"><rect x="2" y="2" width="13" height="13" rx="2"/><path d="M9 22h11a2 2 0 0 0 2-2V9"/></svg>
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}
