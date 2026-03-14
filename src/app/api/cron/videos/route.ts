import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const CRON_SECRET = process.env.CRON_SECRET

/**
 * Fetches latest videos from all enabled YouTube channels.
 * Called on a schedule (e.g. every 30 minutes) or manually from admin.
 *
 * Requires YOUTUBE_API_KEY env var and CRON_SECRET for auth.
 */
export async function POST(request: NextRequest) {
  // Auth check
  const authHeader = request.headers.get('x-cron-secret')
  if (authHeader !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!YOUTUBE_API_KEY) {
    return NextResponse.json({ error: 'YOUTUBE_API_KEY not configured' }, { status: 500 })
  }

  const channels = await prisma.youTubeChannel.findMany({
    where: { enabled: true },
  })

  if (channels.length === 0) {
    return NextResponse.json({ message: 'No channels configured', fetched: 0 })
  }

  let totalFetched = 0
  const errors: string[] = []

  for (const channel of channels) {
    try {
      const fetched = await fetchChannelVideos(channel.channelId)
      totalFetched += fetched
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${channel.name}: ${msg}`)
    }
  }

  return NextResponse.json({
    message: `Fetched ${totalFetched} new videos from ${channels.length} channels`,
    fetched: totalFetched,
    errors: errors.length > 0 ? errors : undefined,
  })
}

async function fetchChannelVideos(channelId: string): Promise<number> {
  // Step 1: Get the channel's uploads playlist
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet&id=${channelId}&key=${YOUTUBE_API_KEY}`
  )
  const channelData = await channelRes.json()

  if (!channelData.items?.length) {
    throw new Error(`Channel ${channelId} not found`)
  }

  const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads
  const channelSnippet = channelData.items[0].snippet

  // Update channel info
  await prisma.youTubeChannel.update({
    where: { channelId },
    data: {
      name: channelSnippet.title,
      url: `https://www.youtube.com/channel/${channelId}`,
      thumbnailUrl: channelSnippet.thumbnails?.default?.url || null,
    },
  })

  // Step 2: Get latest videos from uploads playlist
  const playlistRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=10&key=${YOUTUBE_API_KEY}`
  )
  const playlistData = await playlistRes.json()

  if (!playlistData.items?.length) return 0

  const videoIds = playlistData.items
    .map((item: { snippet: { resourceId: { videoId: string } } }) => item.snippet.resourceId.videoId)
    .filter(Boolean)

  if (videoIds.length === 0) return 0

  // Step 3: Get video details (duration, view count)
  const detailsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics,snippet&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`
  )
  const detailsData = await detailsRes.json()

  let created = 0

  for (const item of detailsData.items || []) {
    const existing = await prisma.youTubeVideo.findUnique({
      where: { videoId: item.id },
    })

    if (existing) continue

    // Find the channel record
    const channelRecord = await prisma.youTubeChannel.findUnique({
      where: { channelId },
    })

    if (!channelRecord) continue

    await prisma.youTubeVideo.create({
      data: {
        videoId: item.id,
        title: item.snippet.title,
        description: item.snippet.description || null,
        thumbnailUrl:
          item.snippet.thumbnails?.maxres?.url ||
          item.snippet.thumbnails?.high?.url ||
          item.snippet.thumbnails?.medium?.url ||
          null,
        channelId: channelRecord.id,
        publishedAt: new Date(item.snippet.publishedAt),
        duration: item.contentDetails?.duration || null,
        viewCount: item.statistics?.viewCount
          ? parseInt(item.statistics.viewCount, 10)
          : null,
      },
    })
    created++
  }

  return created
}
