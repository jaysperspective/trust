import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyCronSecret, isAdminAuthenticated } from '@/lib/auth'

const GRAPH_API_VERSION = 'v21.0'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`

/**
 * Fetches latest Instagram posts via the Graph API and caches them.
 * Auth: cron secret header OR admin session cookie.
 */
export async function POST(request: NextRequest) {
  const cronHeader = request.headers.get('x-cron-secret')
  const isAuthorized = verifyCronSecret(cronHeader) || await isAdminAuthenticated()

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID

  if (!accessToken || !accountId) {
    return NextResponse.json(
      { error: 'INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_BUSINESS_ACCOUNT_ID not configured' },
      { status: 500 }
    )
  }

  try {
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count'
    const url = `${GRAPH_BASE}/${accountId}/media?fields=${fields}&limit=25&access_token=${accessToken}`

    const res = await fetch(url)
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json(
        { error: 'Instagram API error', details: err },
        { status: res.status }
      )
    }

    const data = await res.json()
    const posts = data.data || []

    let created = 0

    for (const post of posts) {
      const existing = await prisma.instagramPost.findUnique({
        where: { postId: post.id },
      })

      if (existing) {
        // Update engagement counts on existing posts
        await prisma.instagramPost.update({
          where: { postId: post.id },
          data: {
            likeCount: post.like_count ?? null,
            commentsCount: post.comments_count ?? null,
          },
        })
        continue
      }

      await prisma.instagramPost.create({
        data: {
          postId: post.id,
          permalink: post.permalink,
          caption: post.caption || null,
          mediaType: post.media_type,
          mediaUrl: post.media_url,
          thumbnailUrl: post.thumbnail_url || null,
          timestamp: new Date(post.timestamp),
          likeCount: post.like_count ?? null,
          commentsCount: post.comments_count ?? null,
        },
      })
      created++
    }

    return NextResponse.json({
      message: `Fetched ${created} new Instagram posts, updated ${posts.length - created} existing`,
      created,
      total: posts.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
