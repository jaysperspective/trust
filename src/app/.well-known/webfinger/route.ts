import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const resource = new URL(request.url).searchParams.get('resource')
  if (!resource) {
    return NextResponse.json({ error: 'Missing resource parameter' }, { status: 400 })
  }

  // Parse acct:handle@domain
  const match = resource.match(/^acct:([^@]+)@(.+)$/)
  if (!match) {
    return NextResponse.json({ error: 'Invalid resource format' }, { status: 400 })
  }

  const [, handle, domain] = match
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://plusntrust.org'
  const expectedDomain = new URL(baseUrl).hostname

  if (domain !== expectedDomain) {
    return NextResponse.json({ error: 'Unknown domain' }, { status: 404 })
  }

  const agent = await prisma.agent.findUnique({ where: { handle } })
  if (!agent) {
    return NextResponse.json({ error: 'Unknown user' }, { status: 404 })
  }

  return NextResponse.json({
    subject: resource,
    aliases: [`${baseUrl}/a/${handle}`],
    links: [
      {
        rel: 'self',
        type: 'application/activity+json',
        href: `${baseUrl}/api/activitypub/actors/${handle}`,
      },
      {
        rel: 'http://webfinger.net/rel/profile-page',
        type: 'text/html',
        href: `${baseUrl}/a/${handle}`,
      },
    ],
  }, {
    headers: {
      'Content-Type': 'application/jrd+json',
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    }
  })
}
