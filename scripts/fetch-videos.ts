import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY

async function fetchChannelVideos(channelId: string, channelDbId: string, maxResults: number = 10): Promise<number> {
  // Get uploads playlist
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

  // Get latest videos
  const playlistRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`
  )
  const playlistData = await playlistRes.json()

  if (!playlistData.items?.length) return 0

  const videoIds = playlistData.items
    .map((item: any) => item.snippet.resourceId.videoId)
    .filter(Boolean)

  if (videoIds.length === 0) return 0

  // Get video details
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
        channelId: channelDbId,
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

async function main() {
  if (!YOUTUBE_API_KEY) {
    console.error('YOUTUBE_API_KEY not set')
    process.exit(1)
  }

  const channels = await prisma.youTubeChannel.findMany({ where: { enabled: true } })
  console.log(`Fetching videos from ${channels.length} channels...\n`)

  let total = 0

  for (const ch of channels) {
    try {
      const count = await fetchChannelVideos(ch.channelId, ch.id, ch.maxResults)
      total += count
      console.log(`  ${ch.name}: ${count} new videos`)
    } catch (err: any) {
      console.error(`  ${ch.name}: ERROR - ${err.message}`)
    }
  }

  console.log(`\nDone! ${total} new videos fetched.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
