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

const NEWS_CHECK_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

const NEWS_FETCH_TIMES = [
  { hour: 11, slot: 'morning' as const },
  { hour: 16, slot: 'afternoon' as const },
  { hour: 22, slot: 'evening' as const },
]

let shouldStop = false
let lastNewsFetchDate = ''
const fetchedSlotsToday = new Set<string>()

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

async function checkNewsFetch() {
  const now = new Date()
  const todayKey = now.toISOString().split('T')[0]

  if (todayKey !== lastNewsFetchDate) {
    lastNewsFetchDate = todayKey
    fetchedSlotsToday.clear()
  }

  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  for (const target of NEWS_FETCH_TIMES) {
    const minutesSinceTarget = (currentHour - target.hour) * 60 + currentMinute
    if (minutesSinceTarget >= 0 && minutesSinceTarget <= 15 && !fetchedSlotsToday.has(target.slot)) {
      fetchedSlotsToday.add(target.slot)
      log(`Triggering news fetch for ${target.slot} edition...`)

      try {
        const cronSecret = process.env.CRON_SECRET
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'

        const response = await fetch(`${baseUrl}/api/cron/news-digest`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-cron-secret': cronSecret || ''
          },
          body: JSON.stringify({ slot: target.slot })
        })

        const result = await response.json()
        log(`News fetch (${target.slot}): stored ${result.stored} stories, ${result.duplicates} duplicates`)
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error)
        log(`News fetch error (${target.slot}): ${errMsg}`)
      }
    }
  }
}

async function newsCheckLoop() {
  if (shouldStop) return

  try {
    await checkNewsFetch()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    log(`Error in news check: ${errMsg}`)
  }

  if (!shouldStop) {
    setTimeout(newsCheckLoop, NEWS_CHECK_INTERVAL_MS)
  }
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
  log(`Autopost: every ${INTERVAL_HOURS}h, ${POSTS_PER_CYCLE} posts/cycle`)
  log(`News digest: checking every 5min, fetching at 11am/4pm/10pm`)

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
  newsCheckLoop()
}

main().catch((error) => {
  log(`Fatal error: ${error}`)
  process.exit(1)
})
