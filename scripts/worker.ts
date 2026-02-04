/**
 * URA Pages Task Worker
 *
 * Polls the Task table and processes queued tasks.
 *
 * Usage: npx tsx scripts/worker.ts
 *
 * Environment variables:
 * - WORKER_POLL_INTERVAL: Poll interval in ms (default: 5000)
 * - WORKER_MAX_CONCURRENT: Max concurrent tasks (default: 1)
 */

import { PrismaClient, TaskStatus } from '@prisma/client'

const prisma = new PrismaClient()

const POLL_INTERVAL = parseInt(process.env.WORKER_POLL_INTERVAL || '5000', 10)
const MAX_CONCURRENT = parseInt(process.env.WORKER_MAX_CONCURRENT || '1', 10)

let runningTasks = 0
let shouldStop = false

async function claimTask() {
  // Try to claim a queued task that is due
  const now = new Date()
  const task = await prisma.task.findFirst({
    where: {
      status: TaskStatus.queued,
      OR: [
        { scheduledFor: null },
        { scheduledFor: { lte: now } }
      ]
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

  if (!task) {
    return null
  }

  // Attempt to claim with optimistic lock
  const result = await prisma.task.updateMany({
    where: {
      id: task.id,
      status: TaskStatus.queued
    },
    data: {
      status: TaskStatus.running,
      claimedAt: new Date(),
      attempts: { increment: 1 }
    }
  })

  if (result.count === 0) {
    return null
  }

  return prisma.task.findUnique({
    where: { id: task.id },
    include: {
      agent: true,
      roundtable: true
    }
  })
}

async function processTask(taskId: string): Promise<void> {
  // Dynamic import to handle the module
  const { processTask: process } = await import('../src/lib/workers/task-processor')
  await process(taskId)
}

async function poll() {
  if (shouldStop) {
    return
  }

  while (runningTasks < MAX_CONCURRENT) {
    const task = await claimTask()
    if (!task) {
      break
    }

    runningTasks++
    console.log(`[Worker] Claimed task ${task.id} (${task.taskType})`)

    processTask(task.id)
      .then(() => {
        console.log(`[Worker] Completed task ${task.id}`)
      })
      .catch((error) => {
        console.error(`[Worker] Failed task ${task.id}:`, error)
      })
      .finally(() => {
        runningTasks--
      })
  }

  if (!shouldStop) {
    setTimeout(poll, POLL_INTERVAL)
  }
}

async function main() {
  console.log('[Worker] Starting URA Pages Task Worker')
  console.log(`[Worker] Poll interval: ${POLL_INTERVAL}ms`)
  console.log(`[Worker] Max concurrent: ${MAX_CONCURRENT}`)

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n[Worker] Received SIGINT, shutting down...')
    shouldStop = true
    if (runningTasks === 0) {
      process.exit(0)
    }
  })

  process.on('SIGTERM', () => {
    console.log('\n[Worker] Received SIGTERM, shutting down...')
    shouldStop = true
    if (runningTasks === 0) {
      process.exit(0)
    }
  })

  // Start polling
  poll()
}

main().catch((error) => {
  console.error('[Worker] Fatal error:', error)
  process.exit(1)
})
