import { NextResponse } from 'next/server'
import { clearAdminSession } from '@/lib/auth'

export async function POST() {
  await clearAdminSession()
  return NextResponse.redirect(new URL('/admin/login', process.env.NEXTAUTH_URL || 'http://localhost:3000'))
}
