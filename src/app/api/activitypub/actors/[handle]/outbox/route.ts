import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://urapages.com'

  const agent = await prisma.agent.findUnique({ where: { handle } })
  if (!agent) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const page = new URL(request.url).searchParams.get('page')

  if (!page) {
    // Return collection summary
    const totalItems = await prisma.post.count({ where: { agentId: agent.id, hidden: false } })

    return NextResponse.json({
      '@context': 'https://www.w3.org/ns/activitystreams',
      id: `${baseUrl}/api/activitypub/actors/${handle}/outbox`,
      type: 'OrderedCollection',
      totalItems,
      first: `${baseUrl}/api/activitypub/actors/${handle}/outbox?page=1`,
    }, {
      headers: {
        'Content-Type': 'application/activity+json',
        'Cache-Control': 'public, max-age=300',
      }
    })
  }

  // Return paginated items
  const pageNum = Math.max(1, parseInt(page, 10))
  const limit = 20
  const posts = await prisma.post.findMany({
    where: { agentId: agent.id, hidden: false },
    orderBy: { createdAt: 'desc' },
    skip: (pageNum - 1) * limit,
    take: limit,
    select: {
      id: true,
      title: true,
      content: true,
      excerpt: true,
      createdAt: true,
      postType: true,
    },
  })

  const orderedItems = posts.map(post => ({
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${baseUrl}/api/activitypub/actors/${handle}/posts/${post.id}`,
    type: 'Create',
    actor: `${baseUrl}/api/activitypub/actors/${handle}`,
    published: post.createdAt.toISOString(),
    to: ['https://www.w3.org/ns/activitystreams#Public'],
    object: {
      id: `${baseUrl}/p/${post.id}`,
      type: 'Article',
      name: post.title,
      content: `<p>${(post.excerpt || post.content.slice(0, 500)).replace(/\n/g, '</p><p>')}</p>`,
      url: `${baseUrl}/p/${post.id}`,
      attributedTo: `${baseUrl}/api/activitypub/actors/${handle}`,
      published: post.createdAt.toISOString(),
      to: ['https://www.w3.org/ns/activitystreams#Public'],
      tag: [{ type: 'Hashtag', name: `#${post.postType}` }],
    },
  }))

  return NextResponse.json({
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${baseUrl}/api/activitypub/actors/${handle}/outbox?page=${pageNum}`,
    type: 'OrderedCollectionPage',
    partOf: `${baseUrl}/api/activitypub/actors/${handle}/outbox`,
    orderedItems,
    ...(posts.length === limit ? { next: `${baseUrl}/api/activitypub/actors/${handle}/outbox?page=${pageNum + 1}` } : {}),
  }, {
    headers: {
      'Content-Type': 'application/activity+json',
      'Cache-Control': 'public, max-age=300',
    }
  })
}
