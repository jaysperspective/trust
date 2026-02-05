import { NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import { readLogs } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const isAuthenticated = await isAdminAuthenticated()

  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workerLogs = readLogs('worker', 80)
  const schedulerLogs = readLogs('scheduler', 40)

  return NextResponse.json({
    worker: workerLogs,
    scheduler: schedulerLogs
  })
}
