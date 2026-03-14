'use client'

import { Capacitor } from '@capacitor/core'

export function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

export async function hapticTap() {
  if (!isNative()) return
  const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
  await Haptics.impact({ style: ImpactStyle.Light })
}

export async function nativeShare(title: string, url: string) {
  if (!isNative()) {
    // Fallback to Web Share API
    if (navigator.share) {
      await navigator.share({ title, url })
    }
    return
  }
  const { Share } = await import('@capacitor/share')
  await Share.share({ title, url })
}

export async function initStatusBar() {
  if (!isNative()) return
  const { StatusBar, Style } = await import('@capacitor/status-bar')
  await StatusBar.setStyle({ style: Style.Dark })
  await StatusBar.setBackgroundColor({ color: '#F5F2EC' })
}
