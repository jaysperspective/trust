/**
 * plustrust Scheduler
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
import { getAutopostEnabled } from '../src/lib/autopost-config'

const NEWS_TIMEZONE = process.env.NEWS_TIMEZONE || 'America/New_York'

function currentHourInTimezone(tz: string): number {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    hour: '2-digit'
  })
  return parseInt(formatter.format(now), 10)
}

const prisma = new PrismaClient()

const INTERVAL_HOURS = parseInt(process.env.AUTOPOST_INTERVAL_HOURS || '8', 10)
const INTERVAL_MS = INTERVAL_HOURS * 60 * 60 * 1000
const POSTS_PER_CYCLE = parseInt(process.env.POSTS_PER_CYCLE || '3', 10)

const NEWS_CHECK_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

const NEWS_FETCH_TIMES = [
  { hour: 0,  slot: 'early' as const },
  { hour: 3,  slot: 'morning' as const },
  { hour: 6,  slot: 'sunrise' as const },
  { hour: 9,  slot: 'midday' as const },
  { hour: 12, slot: 'afternoon' as const },
  { hour: 15, slot: 'evening' as const },
  { hour: 18, slot: 'night' as const },
  { hour: 21, slot: 'latenight' as const },
]

const MUSIC_FETCH_DAYS = [3, 5] // Wednesday, Friday
const MUSIC_FETCH_HOUR = 6 // 6 AM EST
const INSTAGRAM_FETCH_HOUR = 8 // 8 AM EST

let shouldStop = false
let lastNewsFetchDate = ''
let lastMusicFetchDate = ''
let lastInstagramFetchDate = ''
const fetchedSlotsToday = new Set<string>()

function log(message: string) {
  console.log(message)
  writeLog('scheduler', message)
}

async function createAutopostTasks() {
  const enabled = await getAutopostEnabled()
  if (!enabled) {
    log('Autopost disabled via admin toggle — skipping')
    return
  }

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
  const hourLocal = currentHourInTimezone(NEWS_TIMEZONE)
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: NEWS_TIMEZONE }).format(now)

  if (todayKey !== lastNewsFetchDate) {
    lastNewsFetchDate = todayKey
    fetchedSlotsToday.clear()
  }

  const formatterMinute = new Intl.DateTimeFormat('en-US', {
    timeZone: NEWS_TIMEZONE,
    hour12: false,
    minute: '2-digit'
  })
  const currentMinute = parseInt(formatterMinute.format(now), 10)

  for (const target of NEWS_FETCH_TIMES) {
    const minutesSinceTarget = (hourLocal - target.hour) * 60 + currentMinute
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

async function checkMusicFetch() {
  const now = new Date()
  const hourLocal = currentHourInTimezone(NEWS_TIMEZONE)
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: NEWS_TIMEZONE }).format(now)

  // Already fetched today
  if (todayKey === lastMusicFetchDate) return

  // Get current day of week in EST (0=Sun, 3=Wed, 5=Fri)
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: NEWS_TIMEZONE,
    weekday: 'short'
  })
  const dayStr = dayFormatter.format(now)
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const dayOfWeek = dayMap[dayStr] ?? -1

  if (!MUSIC_FETCH_DAYS.includes(dayOfWeek)) return
  if (hourLocal < MUSIC_FETCH_HOUR || hourLocal > MUSIC_FETCH_HOUR) return

  lastMusicFetchDate = todayKey
  log(`Triggering music fetch (${dayStr} ${MUSIC_FETCH_HOUR}:00 EST)...`)

  try {
    const cronSecret = process.env.CRON_SECRET
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'

    const response = await fetch(`${baseUrl}/api/cron/music-releases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': cronSecret || ''
      }
    })

    const result = await response.json()
    log(`Music fetch: ${result.message}`)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    log(`Music fetch error: ${errMsg}`)
  }
}

async function checkInstagramFetch() {
  const now = new Date()
  const hourLocal = currentHourInTimezone(NEWS_TIMEZONE)
  const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone: NEWS_TIMEZONE }).format(now)

  if (todayKey === lastInstagramFetchDate) return
  if (hourLocal !== INSTAGRAM_FETCH_HOUR) return

  lastInstagramFetchDate = todayKey
  log(`Triggering Instagram fetch (${INSTAGRAM_FETCH_HOUR}:00 EST)...`)

  try {
    const cronSecret = process.env.CRON_SECRET
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'

    const response = await fetch(`${baseUrl}/api/cron/instagram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': cronSecret || ''
      }
    })

    const result = await response.json()
    log(`Instagram fetch: ${result.message}`)
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    log(`Instagram fetch error: ${errMsg}`)
  }
}

async function newsCheckLoop() {
  if (shouldStop) return

  try {
    await checkNewsFetch()
    await checkMusicFetch()
    await checkInstagramFetch()
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    log(`Error in news/music check: ${errMsg}`)
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
  log('Starting plustrust Scheduler')
  log(`Autopost: every ${INTERVAL_HOURS}h, ${POSTS_PER_CYCLE} posts/cycle`)
  log(`News digest: checking every 5min, fetching every 3h (8 slots/day)`)
  log(`Music fetch: Wed & Fri at ${MUSIC_FETCH_HOUR}:00 EST`)
  log(`Instagram fetch: daily at ${INSTAGRAM_FETCH_HOUR}:00 EST`)

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
