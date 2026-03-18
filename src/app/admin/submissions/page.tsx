'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Submission {
  id: string
  prompt: string
  context: string | null
  submitterName: string | null
  submitterEmail: string | null
  status: string
  adminNotes: string | null
  roundtableId: string | null
  createdAt: string
}

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchSubmissions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter) params.set('status', filter)
      const res = await fetch(`/api/admin/submissions?${params}`)
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/admin/login'
          return
        }
        throw new Error('Failed to fetch')
      }
      const data = await res.json()
      setSubmissions(data.submissions)
      setTotal(data.total)
    } catch {
      console.error('Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchSubmissions()
  }, [fetchSubmissions])

  async function handleAction(id: string, status: 'approved' | 'rejected') {
    setActionLoading(id)
    try {
      const res = await fetch('/api/admin/submissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      })
      if (!res.ok) throw new Error('Failed')
      await fetchSubmissions()
    } catch {
      alert('Failed to update submission')
    } finally {
      setActionLoading(null)
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString()
  }

  function statusColor(status: string) {
    switch (status) {
      case 'pending': return 'var(--status-warning)'
      case 'approved': return 'var(--status-running)'
      case 'rejected': return 'var(--status-error, #ef4444)'
      default: return 'var(--text-muted)'
    }
  }

  return (
    <div className="container-page py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/admin" className="text-xs text-[var(--accent-primary)] hover:underline">
              &larr; Dashboard
            </Link>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)] mt-1">
              Roundtable Submissions
            </h1>
            <p className="text-meta mt-1">{total} total submissions</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { label: 'All', value: '' },
            { label: 'Pending', value: 'pending' },
            { label: 'Approved', value: 'approved' },
            { label: 'Rejected', value: 'rejected' },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                filter === value
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-[var(--text-muted)] text-sm py-8 text-center">Loading...</p>
        ) : submissions.length === 0 ? (
          <p className="text-[var(--text-muted)] text-sm py-8 text-center">No submissions found</p>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => (
              <Card key={sub.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] leading-relaxed">
                        {sub.prompt}
                      </p>
                      {sub.context && (
                        <p className="text-xs text-[var(--text-muted)] mt-2 italic">
                          Context: {sub.context}
                        </p>
                      )}
                    </div>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        color: statusColor(sub.status),
                        border: `1px solid ${statusColor(sub.status)}`,
                      }}
                    >
                      {sub.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-meta mb-3">
                    <span>{sub.submitterName || 'Anonymous'}</span>
                    {sub.submitterEmail && (
                      <>
                        <span className="text-[var(--border-default)]">&middot;</span>
                        <span>{sub.submitterEmail}</span>
                      </>
                    )}
                    <span className="text-[var(--border-default)]">&middot;</span>
                    <span>{formatDate(sub.createdAt)}</span>
                  </div>

                  {sub.roundtableId && (
                    <div className="mb-3">
                      <Link
                        href={`/roundtables/${sub.roundtableId}`}
                        className="text-xs text-[var(--accent-primary)] hover:underline"
                      >
                        View Roundtable &rarr;
                      </Link>
                    </div>
                  )}

                  {sub.status === 'pending' && (
                    <div className="flex gap-2 pt-2 border-t border-[var(--border-default)]">
                      <Button
                        size="sm"
                        onClick={() => handleAction(sub.id, 'approved')}
                        disabled={actionLoading === sub.id}
                      >
                        {actionLoading === sub.id ? 'Processing...' : 'Approve & Create Roundtable'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAction(sub.id, 'rejected')}
                        disabled={actionLoading === sub.id}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
