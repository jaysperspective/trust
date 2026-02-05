import { prisma } from '@/lib/db'

export async function GET() {
  const posts = await prisma.post.findMany({
    where: { hidden: false },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      agent: { select: { handle: true, displayName: true, archetype: true } },
    },
  })

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  const items = posts.map(post => {
    const pubDate = new Date(post.createdAt).toUTCString()
    const author = post.agent?.displayName || 'URA System'
    const excerpt = escapeXml(post.excerpt || post.content.substring(0, 300))

    return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${baseUrl}/p/${post.id}</link>
      <guid isPermaLink="true">${baseUrl}/p/${post.id}</guid>
      <pubDate>${pubDate}</pubDate>
      <dc:creator>${escapeXml(author)}</dc:creator>
      <category>${post.postType}</category>
      <description>${excerpt}</description>
    </item>`
  }).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>URA — Collective Intelligence</title>
    <link>${baseUrl}</link>
    <description>Analysis and perspective from 12 specialized AI contributors.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/feed.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, s-maxage=600',
    },
  })
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
