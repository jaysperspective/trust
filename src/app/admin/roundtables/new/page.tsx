'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Agent {
  id: string
  handle: string
  displayName: string
  moonSign: string
  archetype: string
}

export default function NewRoundtablePage() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [promptBody, setPromptBody] = useState('')
  const [contextNotes, setContextNotes] = useState('')
  const [contextLinks, setContextLinks] = useState('')
  const [selectedAgents, setSelectedAgents] = useState<string[]>([])
  const [responseMode, setResponseMode] = useState<'short' | 'full'>('full')
  const [groundingMode, setGroundingMode] = useState<'must_cite' | 'lens_only'>('must_cite')
  const [enableCrossResponses, setEnableCrossResponses] = useState(false)
  const [enableSynthesis, setEnableSynthesis] = useState(true)

  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await fetch('/api/agents')
        if (res.ok) {
          const data = await res.json()
          setAgents(data)
          setSelectedAgents(data.map((a: Agent) => a.id))
        }
      } catch {
        console.error('Failed to load agents')
      }
    }
    loadAgents()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/admin/roundtables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          promptBody,
          contextNotes: contextNotes || null,
          contextLinks: contextLinks.split('\n').filter(Boolean),
          participantIds: selectedAgents,
          responseMode,
          groundingMode,
          enableCrossResponses,
          enableSynthesis
        })
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/roundtables/${data.id}`)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create roundtable')
      }
    } catch {
      setError('Failed to create roundtable')
    } finally {
      setLoading(false)
    }
  }

  function toggleAgent(id: string) {
    setSelectedAgents(prev =>
      prev.includes(id)
        ? prev.filter(a => a !== id)
        : [...prev, id]
    )
  }

  function selectAll() {
    setSelectedAgents(agents.map(a => a.id))
  }

  function selectNone() {
    setSelectedAgents([])
  }

  return (
    <div className="container-page py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-8">
          Create Roundtable
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <Card>
            <CardContent className="p-5">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What question or topic should the agents discuss?"
                required
              />
            </CardContent>
          </Card>

          {/* Prompt */}
          <Card>
            <CardContent className="p-5">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Prompt Body
              </label>
              <Textarea
                value={promptBody}
                onChange={(e) => setPromptBody(e.target.value)}
                placeholder="The main question or prompt for the agents to respond to..."
                rows={4}
                required
              />
            </CardContent>
          </Card>

          {/* Context */}
          <Card>
            <CardContent className="p-5">
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Context Notes (optional)
              </label>
              <Textarea
                value={contextNotes}
                onChange={(e) => setContextNotes(e.target.value)}
                placeholder="Additional context or background information..."
                rows={3}
              />

              <label className="block text-sm font-medium text-[var(--text-primary)] mt-4 mb-2">
                Context Links (optional, one per line)
              </label>
              <Textarea
                value={contextLinks}
                onChange={(e) => setContextLinks(e.target.value)}
                placeholder={"https://example.com/article\nhttps://another-source.com"}
                rows={2}
              />
            </CardContent>
          </Card>

          {/* Participants */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-[var(--text-primary)]">
                  Participants ({selectedAgents.length}/{agents.length})
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs text-[var(--accent-primary)] hover:underline"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={selectNone}
                    className="text-xs text-[var(--accent-primary)] hover:underline"
                  >
                    Select none
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    type="button"
                    onClick={() => toggleAgent(agent.id)}
                    className={cn(
                      'p-2.5 rounded-lg border text-left transition-colors',
                      selectedAgents.includes(agent.id)
                        ? 'border-[var(--accent-primary)] bg-[rgba(47,212,200,0.08)]'
                        : 'border-[var(--border-default)] hover:border-[var(--accent-muted)]'
                    )}
                  >
                    <p className="font-medium text-sm text-[var(--text-primary)]">
                      {agent.displayName}
                    </p>
                    <p className="text-meta mt-0.5">
                      {agent.archetype}
                    </p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Options */}
          <Card>
            <CardContent className="p-5">
              <h3 className="text-meta uppercase tracking-wider mb-4">
                Response Options
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-meta mb-2">
                    Response Length
                  </label>
                  <div className="flex gap-2">
                    {(['short', 'full'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setResponseMode(mode)}
                        className={cn(
                          'flex-1 py-2 px-3 rounded-lg border text-sm transition-colors',
                          responseMode === mode
                            ? 'border-[var(--accent-primary)] bg-[rgba(47,212,200,0.08)] text-[var(--text-primary)]'
                            : 'border-[var(--border-default)] text-[var(--text-muted)]'
                        )}
                      >
                        {mode === 'short' ? 'Short (100-180w)' : 'Full (250-450w)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-meta mb-2">
                    Grounding Mode
                  </label>
                  <div className="flex gap-2">
                    {(['must_cite', 'lens_only'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setGroundingMode(mode)}
                        className={cn(
                          'flex-1 py-2 px-3 rounded-lg border text-sm transition-colors',
                          groundingMode === mode
                            ? 'border-[var(--accent-primary)] bg-[rgba(47,212,200,0.08)] text-[var(--text-primary)]'
                            : 'border-[var(--border-default)] text-[var(--text-muted)]'
                        )}
                      >
                        {mode === 'must_cite' ? 'Must Cite' : 'Lens Only'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-5 mt-4 pt-4 border-t border-[var(--border-default)]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableCrossResponses}
                    onChange={(e) => setEnableCrossResponses(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border-default)] accent-[var(--accent-primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">
                    Cross-responses
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableSynthesis}
                    onChange={(e) => setEnableSynthesis(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border-default)] accent-[var(--accent-primary)]"
                  />
                  <span className="text-sm text-[var(--text-primary)]">
                    Synthesis
                  </span>
                </label>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="p-4 rounded-lg bg-[rgba(199,91,91,0.1)] border border-[rgba(199,91,91,0.3)] text-[var(--status-error)] text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={!title || !promptBody || selectedAgents.length === 0}
            >
              Create Roundtable
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
