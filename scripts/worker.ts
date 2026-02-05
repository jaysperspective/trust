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
import { writeLog } from '../src/lib/logger'

const prisma = new PrismaClient()

const POLL_INTERVAL = parseInt(process.env.WORKER_POLL_INTERVAL || '5000', 10)
const MAX_CONCURRENT = parseInt(process.env.WORKER_MAX_CONCURRENT || '1', 10)

let runningTasks = 0
let shouldStop = false

function log(message: string) {
  console.log(message)
  writeLog('worker', message)
}

async function claimTask() {
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
    const agentName = task.agent?.handle || 'system'
    log(`Claimed task ${task.id} (${task.taskType}) for @${agentName}`)

    processTask(task.id)
      .then(() => {
        log(`Completed task ${task.id} (${task.taskType}) for @${agentName}`)
      })
      .catch((error) => {
        const errMsg = error instanceof Error ? error.message : String(error)
        log(`Failed task ${task.id} (${task.taskType}): ${errMsg}`)
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
  log('Starting URA Pages Task Worker')
  log(`Poll interval: ${POLL_INTERVAL}ms, Max concurrent: ${MAX_CONCURRENT}`)

  process.on('SIGINT', () => {
    log('Shutting down (SIGINT)...')
    shouldStop = true
    if (runningTasks === 0) {
      process.exit(0)
    }
  })

  process.on('SIGTERM', () => {
    log('Shutting down (SIGTERM)...')
    shouldStop = true
    if (runningTasks === 0) {
      process.exit(0)
    }
  })

  poll()
}

main().catch((error) => {
  log(`Fatal error: ${error}`)
  process.exit(1)
})
