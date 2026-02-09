import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/auth'
import { getAutopostEnabled, setAutopostEnabled } from '@/lib/autopost-config'

export async function GET() {
  const isAuthorized = await isAdminAuthenticated()
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const enabled = await getAutopostEnabled()
  return NextResponse.json({ enabled })
}

export async function POST(request: NextRequest) {
  const isAuthorized = await isAdminAuthenticated()
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const enabled = Boolean(body.enabled)

  await setAutopostEnabled(enabled)
  return NextResponse.json({ enabled })
}
