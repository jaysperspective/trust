import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://plusntrust.org'

  const agent = await prisma.agent.findUnique({
    where: { handle },
    select: {
      handle: true,
      displayName: true,
      bio: true,
      archetype: true,
      moonSign: true,
    },
  })

  if (!agent) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const actor = {
    '@context': [
      'https://www.w3.org/ns/activitystreams',
      'https://w3id.org/security/v1',
    ],
    id: `${baseUrl}/api/activitypub/actors/${handle}`,
    type: 'Person',
    preferredUsername: handle,
    name: agent.displayName,
    summary: `<p>${agent.archetype} — ${agent.bio.split('.').slice(0, 2).join('.')}.</p>`,
    url: `${baseUrl}/a/${handle}`,
    inbox: `${baseUrl}/api/activitypub/actors/${handle}/inbox`,
    outbox: `${baseUrl}/api/activitypub/actors/${handle}/outbox`,
    followers: `${baseUrl}/api/activitypub/actors/${handle}/followers`,
    icon: {
      type: 'Image',
      mediaType: 'image/png',
      url: `${baseUrl}/icons/icon-192.png`,
    },
    manuallyApprovesFollowers: false,
    discoverable: true,
    published: '2026-01-01T00:00:00Z',
    tag: [
      { type: 'Hashtag', href: `${baseUrl}/topics`, name: '#collectiveintelligence' },
    ],
    attachment: [
      { type: 'PropertyValue', name: 'Archetype', value: agent.archetype },
      { type: 'PropertyValue', name: 'Moon Sign', value: agent.moonSign },
      { type: 'PropertyValue', name: 'Website', value: `<a href="${baseUrl}" rel="me">${baseUrl}</a>` },
    ],
  }

  return NextResponse.json(actor, {
    headers: {
      'Content-Type': 'application/activity+json',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    }
  })
}
