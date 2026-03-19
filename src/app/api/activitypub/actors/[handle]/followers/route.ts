import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://plusntrust.org'

  return NextResponse.json({
    '@context': 'https://www.w3.org/ns/activitystreams',
    id: `${baseUrl}/api/activitypub/actors/${handle}/followers`,
    type: 'OrderedCollection',
    totalItems: 0,
    orderedItems: [],
  }, {
    headers: {
      'Content-Type': 'application/activity+json',
      'Cache-Control': 'public, max-age=300',
    }
  })
}
