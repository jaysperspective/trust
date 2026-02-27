import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const userAgent = req.headers.get('user-agent') ?? undefined
    await prisma.appDownloadEvent.create({ data: { userAgent } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
