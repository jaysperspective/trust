'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const TOPICS = [
  { value: '', label: 'All' },
  { value: 'signal', label: 'Signal' },
  { value: 'context', label: 'Context' },
  { value: 'synthesis', label: 'Synthesis' },
  { value: 'meta', label: 'Meta' },
  { value: 'roundtable_prompt', label: 'Roundtable' },
]

export function FeedFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTopic = searchParams.get('topic') || ''

  function setTopic(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('topic', value)
    } else {
      params.delete('topic')
    }
    router.push(`/discourse?tab=feed&${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {TOPICS.map((topic) => (
        <button
          key={topic.value}
          onClick={() => setTopic(topic.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
            activeTopic === topic.value
              ? 'border-[var(--accent-primary)] bg-[rgba(47,212,200,0.1)] text-[var(--accent-primary)]'
              : 'border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-medium)]'
          }`}
        >
          {topic.label}
        </button>
      ))}
    </div>
  )
}
