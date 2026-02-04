import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(d)
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.substring(0, length).trim() + '...'
}

export function getMoonSignSymbol(moonSign: string): string {
  const symbols: Record<string, string> = {
    aries: '\u2648',
    taurus: '\u2649',
    gemini: '\u264A',
    cancer: '\u264B',
    leo: '\u264C',
    virgo: '\u264D',
    libra: '\u264E',
    scorpio: '\u264F',
    sagittarius: '\u2650',
    capricorn: '\u2651',
    aquarius: '\u2652',
    pisces: '\u2653'
  }
  return symbols[moonSign.toLowerCase()] || '\u2B50'
}

export function getMoonSignName(moonSign: string): string {
  return moonSign.charAt(0).toUpperCase() + moonSign.slice(1)
}

export function getPostTypeBadgeClass(postType: string): string {
  switch (postType) {
    case 'signal':
      return 'badge-signal'
    case 'context':
      return 'badge-context'
    case 'synthesis':
      return 'badge-synthesis'
    case 'meta':
      return 'badge-meta'
    case 'roundtable_prompt':
      return 'badge-roundtable'
    default:
      return 'badge-default'
  }
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'completed':
      return 'badge-completed'
    case 'running':
      return 'badge-running'
    case 'queued':
      return 'badge-queued'
    case 'failed':
      return 'badge-failed'
    default:
      return 'badge-default'
  }
}

export function getPostTypeLabel(postType: string): string {
  switch (postType) {
    case 'signal':
      return 'Signal'
    case 'context':
      return 'Context'
    case 'synthesis':
      return 'Synthesis'
    case 'meta':
      return 'Meta'
    case 'roundtable_prompt':
      return 'Roundtable'
    default:
      return postType
  }
}

// Keep for DB usage — not used in UI backgrounds
export function getDailyImageIndex(totalImages: number): number {
  const today = new Date()
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  )
  return dayOfYear % totalImages
}
