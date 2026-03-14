'use client'

export function isNative(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as unknown as Record<string, unknown>).Capacitor
}

export async function hapticTap() {
  // Haptics only available in Capacitor shell — no-op on web
}

export async function nativeShare(title: string, url: string) {
  // Use Web Share API (works on iOS Safari and Capacitor)
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, url })
    } catch { /* user cancelled */ }
  }
}

export async function initStatusBar() {
  // Status bar styling handled by Capacitor native config — no-op on web
}
