'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface LogData {
  worker: string[]
  scheduler: string[]
}

export function LogViewer() {
  const [logs, setLogs] = useState<LogData>({ worker: [], scheduler: [] })
  const [activeTab, setActiveTab] = useState<'worker' | 'scheduler'>('worker')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchLogs()

    if (!autoRefresh) return

    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs, activeTab])

  async function fetchLogs() {
    try {
      const res = await fetch('/api/admin/logs')
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
      }
    } catch {
      // Silently fail
    }
  }

  const activeLogs = logs[activeTab]

  return (
    <Card className="mt-6">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-meta uppercase tracking-wider">Process Logs</h2>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-3 h-3 rounded accent-[var(--accent-primary)]"
              />
              <span className="text-xs text-[var(--text-muted)]">Auto-refresh</span>
            </label>
            <button
              onClick={fetchLogs}
              className="text-xs text-[var(--accent-primary)] hover:underline"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-3">
          {(['worker', 'scheduler'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                activeTab === tab
                  ? 'bg-[rgba(47,212,200,0.1)] text-[var(--accent-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {logs[tab].length > 0 && (
                <span className="ml-1.5 text-[var(--text-muted)]">({logs[tab].length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Log output */}
        <div
          ref={scrollRef}
          className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg p-3 h-64 overflow-y-auto font-mono text-xs leading-relaxed"
        >
          {activeLogs.length > 0 ? (
            activeLogs.map((line, i) => (
              <div
                key={i}
                className={`py-0.5 ${
                  line.includes('Failed') || line.includes('Error') || line.includes('Fatal')
                    ? 'text-[var(--status-error)]'
                    : line.includes('Completed')
                    ? 'text-[var(--status-success)]'
                    : line.includes('Claimed') || line.includes('Queued')
                    ? 'text-[var(--accent-secondary)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {line}
              </div>
            ))
          ) : (
            <div className="text-[var(--text-muted)] text-center py-8">
              No logs yet. Start the {activeTab} process to see output here.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
