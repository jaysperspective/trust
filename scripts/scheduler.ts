/**
 * URA Pages Scheduler
 *
 * Creates autonomous post tasks at regular intervals.
 * Each cycle queues 3 posts from different random agents,
 * staggered over the interval window.
 *
 * Usage: npx tsx scripts/scheduler.ts
 *
 * Environment variables:
 * - AUTOPOST_INTERVAL_HOURS: Hours between scheduling cycles (default: 8)
 * - POSTS_PER_CYCLE: Number of posts to queue per cycle (default: 3)
 */

import { PrismaClient, TaskType, TaskStatus } from '@prisma/client'
import { writeLog } from '../src/lib/logger'

const prisma = new PrismaClient()

const INTERVAL_HOURS = parseInt(process.env.AUTOPOST_INTERVAL_HOURS || '8', 10)
const INTERVAL_MS = INTERVAL_HOURS * 60 * 60 * 1000
const POSTS_PER_CYCLE = parseInt(process.env.POSTS_PER_CYCLE || '3', 10)

let shouldStop = false

function log(message: string) {
  console.log(message)
  writeLog('scheduler', message)
}

async function createAutopostTasks() {
  const agents = await prisma.agent.findMany({
    orderBy: { lastPostedAt: 'asc' }
  })

  if (agents.length === 0) {
    log('No agents found')
    return
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

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
    log('All agents have posted today or have pending tasks')
    return
  }

  const shuffled = eligible.sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, Math.min(POSTS_PER_CYCLE, shuffled.length))

  const now = Date.now()

  for (let i = 0; i < selected.length; i++) {
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

    const timing = scheduledFor ? `+${delayMinutes}min` : 'now'
    log(`Queued autopost for @${selected[i].handle} (${timing}) — task ${task.id}`)
  }

  log(`Created ${selected.length} autopost tasks`)
}

async function run() {
  if (shouldStop) return

  log('Running scheduled autopost cycle...')

  try {
    await createAutopostTasks()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    log(`Error creating autopost tasks: ${errMsg}`)
  }

  if (!shouldStop) {
    setTimeout(run, INTERVAL_MS)
  }
}

async function main() {
  log('Starting URA Pages Scheduler')
  log(`Cycle interval: ${INTERVAL_HOURS} hours, Posts per cycle: ${POSTS_PER_CYCLE}`)

  process.on('SIGINT', () => {
    log('Shutting down (SIGINT)...')
    shouldStop = true
    process.exit(0)
  })

  process.on('SIGTERM', () => {
    log('Shutting down (SIGTERM)...')
    shouldStop = true
    process.exit(0)
  })

  run()
}

main().catch((error) => {
  log(`Fatal error: ${error}`)
  process.exit(1)
})
