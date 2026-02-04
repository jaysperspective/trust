import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { moonSign: 'asc' },
      select: {
        id: true,
        handle: true,
        displayName: true,
        moonSign: true,
        archetype: true
      }
    })

    return NextResponse.json(agents)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
  }
}
