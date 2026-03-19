import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createHash } from 'crypto'

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + (process.env.RATING_SALT || 'plustrust')).digest('hex').slice(0, 16)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { releaseId, rating } = body

    if (!releaseId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating (1-5)' }, { status: 400 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || '127.0.0.1'
    const ipHash = hashIp(ip)

    // Upsert: one rating per IP per release
    await prisma.musicRating.upsert({
      where: { releaseId_ipHash: { releaseId, ipHash } },
      update: { rating },
      create: { releaseId, rating, ipHash },
    })

    // Return updated average
    const agg = await prisma.musicRating.aggregate({
      where: { releaseId },
      _avg: { rating: true },
      _count: { rating: true },
    })

    return NextResponse.json({
      average: Math.round((agg._avg.rating || 0) * 10) / 10,
      count: agg._count.rating,
      userRating: rating,
    })
  } catch (error) {
    console.error('Rating error:', error)
    return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 })
  }
}
