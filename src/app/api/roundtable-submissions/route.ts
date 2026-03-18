import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { prompt, context, submitterName, submitterEmail } = body

  if (!prompt || prompt.trim().length < 10) {
    return NextResponse.json({ error: 'Prompt must be at least 10 characters' }, { status: 400 })
  }

  if (prompt.length > 2000) {
    return NextResponse.json({ error: 'Prompt must be under 2000 characters' }, { status: 400 })
  }

  // Rate limit: max 10 submissions per hour globally (simple check)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const recentCount = await prisma.roundtableSubmission.count({
    where: { createdAt: { gte: oneHourAgo } }
  })

  if (recentCount >= 10) {
    return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 })
  }

  const submission = await prisma.roundtableSubmission.create({
    data: {
      prompt: prompt.trim(),
      context: context?.trim() || null,
      submitterName: submitterName?.trim() || null,
      submitterEmail: submitterEmail?.trim() || null,
    }
  })

  return NextResponse.json({ id: submission.id, status: 'pending' })
}
