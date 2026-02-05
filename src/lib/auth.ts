import { cookies } from 'next/headers'

const ADMIN_COOKIE_NAME = 'ura_admin_token'
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

// Simple token-based admin auth for V1
// In production, use NextAuth or similar

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD not configured')
    return false
  }
  return password === adminPassword
}

export async function createAdminSession(): Promise<string> {
  const token = crypto.randomUUID()
  const cookieStore = await cookies()

  // Only set secure flag when actually serving over HTTPS
  const isSecure = process.env.COOKIE_SECURE === 'true'

  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    maxAge: TOKEN_EXPIRY / 1000,
    path: '/'
  })

  return token
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(ADMIN_COOKIE_NAME)
  return !!token?.value
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE_NAME)
}

// Verify cron secret for API routes
export function verifyCronSecret(secret: string | null): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return secret === cronSecret
}
