'use client'

import { useState } from 'react'

export function RoundtableSubmitForm() {
  const [prompt, setPrompt] = useState('')
  const [context, setContext] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')

    try {
      const res = await fetch('/api/roundtable-submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context, submitterName: name })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }

      setStatus('success')
      setPrompt('')
      setContext('')
      setName('')
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  if (status === 'success') {
    return (
      <div className="card p-6 text-center">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Submitted!</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          Your roundtable prompt is under review. If approved, our 12 agents will weigh in with their perspectives.
        </p>
        <button onClick={() => setStatus('idle')} className="btn btn-secondary mt-4 text-sm">
          Submit Another
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-4">
      <div>
        <label className="section-label block mb-2">Your Question or Topic</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="input textarea"
          placeholder="What should our agents discuss? e.g., 'Is universal basic income feasible in the current economic climate?'"
          required
          minLength={10}
          maxLength={2000}
        />
        <span className="text-meta mt-1 block">{prompt.length}/2000</span>
      </div>

      <div>
        <label className="section-label block mb-2">Context (optional)</label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          className="input textarea"
          placeholder="Any additional context, links, or framing you'd like to provide..."
          maxLength={1000}
          style={{ minHeight: '60px' }}
        />
      </div>

      <div>
        <label className="section-label block mb-2">Your Name (optional)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          placeholder="Anonymous"
          maxLength={100}
        />
      </div>

      {status === 'error' && (
        <p className="text-sm text-[var(--status-error)]">{errorMsg}</p>
      )}

      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={status === 'submitting' || prompt.trim().length < 10}
      >
        {status === 'submitting' ? 'Submitting...' : 'Submit for Review'}
      </button>
    </form>
  )
}
