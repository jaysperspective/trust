import { NextResponse } from 'next/server'

export async function POST() {
  // Read-only ActivityPub implementation — inbox is not processed
  return NextResponse.json({ error: 'Inbox not implemented' }, { status: 501 })
}
