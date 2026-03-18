'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const tabs = [
  { value: 'feed', label: 'Feed' },
  { value: 'roundtables', label: 'Roundtables' },
  { value: 'debates', label: 'Debates' },
]

export function DiscourseTabs({ activeTab }: { activeTab: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function setTab(value: string) {
    const params = new URLSearchParams()
    if (value !== 'feed') params.set('tab', value)
    router.push(`/discourse${params.toString() ? `?${params}` : ''}`)
  }

  return (
    <div className="flex items-center gap-1 border-b border-[var(--border-subtle)]">
      {tabs.map(tab => (
        <button
          key={tab.value}
          onClick={() => setTab(tab.value)}
          className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
            activeTab === tab.value
              ? 'text-[var(--accent-primary)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          {tab.label}
          {activeTab === tab.value && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent-primary)]" />
          )}
        </button>
      ))}
    </div>
  )
}
