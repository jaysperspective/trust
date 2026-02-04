import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret, isAdminAuthenticated } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TaskType, TaskStatus } from '@prisma/client'

const POSTS_PER_TRIGGER = 3

export async function POST(request: NextRequest) {
  // Verify either cron secret or admin session
  const cronSecret = request.headers.get('x-cron-secret')
    || (await request.formData().then(f => f.get('secret') as string).catch(() => null))

  const isAuthorized = verifyCronSecret(cronSecret) || await isAdminAuthenticated()

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all agents
    const agents = await prisma.agent.findMany({
      orderBy: { lastPostedAt: 'asc' }
    })

    if (agents.length === 0) {
      return NextResponse.json({ error: 'No agents found' }, { status: 404 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find agents eligible to post (haven't posted today, no pending task)
    const eligible = []
    for (const agent of agents) {
      const postsToday = await prisma.post.count({
        where: {
          agentId: agent.id,
          createdAt: { gte: today }
        }
      })
      if (postsToday > 0) continue

      const existingTask = await prisma.task.findFirst({
        where: {
          agentId: agent.id,
          taskType: TaskType.autonomous_post,
          status: { in: [TaskStatus.queued, TaskStatus.running] }
        }
      })
      if (existingTask) continue

      eligible.push(agent)
    }

    if (eligible.length === 0) {
      return NextResponse.json({
        message: 'All agents have posted today or have pending tasks'
      })
    }

    // Shuffle and pick up to POSTS_PER_TRIGGER agents
    const shuffled = eligible.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(POSTS_PER_TRIGGER, shuffled.length))

    const now = Date.now()
    const created = []

    for (let i = 0; i < selected.length; i++) {
      // Stagger: first immediately, rest spread over next few hours
      const delayMinutes = i === 0 ? 0 : (i * 45) + Math.floor(Math.random() * 30)
      const scheduledFor = delayMinutes > 0
        ? new Date(now + delayMinutes * 60 * 1000)
        : null

      const task = await prisma.task.create({
        data: {
          taskType: TaskType.autonomous_post,
          agentId: selected[i].id,
          scheduledFor,
          input: {}
        }
      })

      created.push({
        taskId: task.id,
        agentHandle: selected[i].handle,
        scheduledIn: delayMinutes > 0 ? `${delayMinutes}min` : 'now'
      })
    }

    return NextResponse.json({
      success: true,
      count: created.length,
      tasks: created,
      message: `Created ${created.length} autopost tasks`
    })
  } catch (error) {
    console.error('Autopost error:', error)
    return NextResponse.json({ error: 'Failed to create autopost tasks' }, { status: 500 })
  }
}

// Also allow GET for simple cron triggers
export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret')
    || request.nextUrl.searchParams.get('secret')

  if (!verifyCronSecret(cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return POST(request)
}
