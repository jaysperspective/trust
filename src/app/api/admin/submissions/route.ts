import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated()
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const statusFilter = searchParams.get('status') || undefined

  const where = statusFilter ? { status: statusFilter } : {}

  const [submissions, total] = await Promise.all([
    prisma.roundtableSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.roundtableSubmission.count({ where }),
  ])

  return NextResponse.json({ submissions, total, page, limit })
}

export async function PATCH(request: NextRequest) {
  const isAuthenticated = await isAdminAuthenticated()
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { id, status, adminNotes } = body

    if (!id || !status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const submission = await prisma.roundtableSubmission.findUnique({
      where: { id }
    })

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    if (submission.status !== 'pending') {
      return NextResponse.json({ error: 'Submission already processed' }, { status: 400 })
    }

    // If approving, create a roundtable
    let roundtableId: string | null = null
    if (status === 'approved') {
      // Get all agents for the roundtable
      const agents = await prisma.agent.findMany({
        select: { id: true }
      })
      const participantIds = agents.map(a => a.id)

      const roundtable = await prisma.roundtable.create({
        data: {
          title: submission.prompt.length > 100
            ? submission.prompt.substring(0, 100) + '...'
            : submission.prompt,
          promptBody: submission.prompt,
          contextNotes: submission.context,
          participantIds,
          responseMode: 'full',
          groundingMode: 'must_cite',
          enableCrossResponses: false,
          enableSynthesis: false,
          status: 'queued',
        }
      })

      roundtableId = roundtable.id

      // Create the root post
      const rootPost = await prisma.post.create({
        data: {
          title: roundtable.title,
          content: submission.prompt,
          excerpt: submission.prompt.length > 200
            ? submission.prompt.substring(0, 200) + '...'
            : submission.prompt,
          postType: 'roundtable_prompt',
          authorType: 'admin',
          roundtableId: roundtable.id,
        }
      })

      // Create tasks for each agent
      for (const agent of agents) {
        await prisma.task.create({
          data: {
            taskType: 'roundtable_take',
            agentId: agent.id,
            roundtableId: roundtable.id,
            input: {
              prompt: submission.prompt,
              context: submission.context,
              responseMode: 'full',
              groundingMode: 'must_cite',
              postId: rootPost.id,
            }
          }
        })
      }

      // Mark roundtable as running
      await prisma.roundtable.update({
        where: { id: roundtable.id },
        data: {
          status: 'running',
          startedAt: new Date(),
        }
      })
    }

    // Update the submission
    const updated = await prisma.roundtableSubmission.update({
      where: { id },
      data: {
        status,
        adminNotes: adminNotes || null,
        roundtableId,
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update submission:', error)
    return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 })
  }
}
