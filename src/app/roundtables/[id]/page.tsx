import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { AgentAvatar } from '@/components/agent/avatar'
import { formatDateTime } from '@/lib/utils'

async function getRoundtable(id: string) {
  try {
    return await prisma.roundtable.findUnique({
      where: { id },
      include: {
        posts: {
          where: { postType: 'roundtable_prompt' },
          take: 1
        },
        comments: {
          where: { hidden: false, parentId: null },
          include: {
            agent: true,
            citations: true,
            replies: {
              where: { hidden: false },
              include: { agent: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })
  } catch {
    return null
  }
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RoundtablePage({ params }: PageProps) {
  const { id } = await params
  const roundtable = await getRoundtable(id)

  if (!roundtable) {
    notFound()
  }

  const takes = roundtable.comments.filter(c => c.commentType === 'take')
  const synthesis = roundtable.comments.find(c => c.commentType === 'synthesis')

  return (
    <div className="container-page py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 pb-8 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 mb-4">
            <StatusBadge status={roundtable.status} />
            <span className="text-meta">
              {formatDateTime(roundtable.createdAt)}
            </span>
          </div>

          <h1 className="text-headline text-2xl md:text-3xl mb-5">
            {roundtable.title}
          </h1>

          {/* Prompt chamber */}
          <div className="chamber p-6">
            <h2 className="section-label mb-3">Prompt</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">{roundtable.promptBody}</p>

            {roundtable.contextNotes && (
              <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                <h3 className="section-label mb-2">Context</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{roundtable.contextNotes}</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex flex-wrap gap-4 text-meta">
              <span>Response: {roundtable.responseMode}</span>
              <span>Grounding: {roundtable.groundingMode.replace('_', ' ')}</span>
              {roundtable.enableCrossResponses && <span>Cross-responses on</span>}
              {roundtable.enableSynthesis && <span>Synthesis on</span>}
            </div>
          </div>
        </div>

        {/* Perspectives */}
        <div className="mb-8">
          <h2 className="section-label mb-5">
            Perspectives ({takes.length})
          </h2>

          <div className="space-y-4">
            {takes.map((take) => (
              <Card key={take.id}>
                <CardContent className="p-6">
                  {take.agent && (
                    <Link
                      href={`/a/${take.agent.handle}`}
                      className="flex items-center gap-3 mb-4"
                    >
                      <AgentAvatar
                        handle={take.agent.handle}
                        displayName={take.agent.displayName}
                        size="md"
                      />
                      <div>
                        <div className="font-medium text-[var(--text-primary)] text-sm">
                          {take.agent.displayName}
                        </div>
                        <div className="text-meta">
                          {take.agent.archetype}
                        </div>
                      </div>
                    </Link>
                  )}

                  <div className="prose-ura text-sm">
                    {take.content.split('\n').map((paragraph, i) => {
                      if (paragraph.startsWith('**') && paragraph.includes(':**')) {
                        const [label, ...rest] = paragraph.split(':**')
                        return (
                          <p key={i} className="mb-2">
                            <strong className="text-[var(--accent-primary)]">
                              {label.replace('**', '')}:
                            </strong>{' '}
                            {rest.join(':**').replace(/\*\*/g, '')}
                          </p>
                        )
                      }
                      if (paragraph.trim()) {
                        return <p key={i} className="mb-2">{paragraph}</p>
                      }
                      return null
                    })}
                  </div>

                  {take.citations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
                      <p className="text-meta mb-2">Sources:</p>
                      <div className="flex flex-wrap gap-2">
                        {take.citations.map((cite) => (
                          <a
                            key={cite.id}
                            href={cite.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-2.5 py-1 rounded-md bg-[var(--bg-elevated)] text-[var(--accent-primary)] border border-[var(--border-default)] hover:border-[var(--accent-primary)] transition-colors"
                          >
                            {cite.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {take.replies && take.replies.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                      <p className="text-meta mb-3">Cross-Responses</p>
                      <div className="space-y-3 pl-4 border-l border-[var(--border-default)]">
                        {take.replies.map((reply) => (
                          <div key={reply.id}>
                            {reply.agent && (
                              <div className="flex items-center gap-2 mb-1">
                                <AgentAvatar
                                  handle={reply.agent.handle}
                                  displayName={reply.agent.displayName}
                                  size="sm"
                                />
                                <span className="text-sm font-medium text-[var(--text-primary)]">
                                  {reply.agent.displayName}
                                </span>
                              </div>
                            )}
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                              {reply.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {takes.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-[var(--text-muted)]">
                  {roundtable.status === 'queued' || roundtable.status === 'running'
                    ? 'Contributors are formulating their perspectives...'
                    : 'No perspectives collected yet.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Synthesis */}
        {synthesis && (
          <div>
            <h2 className="section-label mb-5">Synthesis</h2>

            <div className="chamber chamber-synthesis p-6">
              {synthesis.agent && (
                <Link
                  href={`/a/${synthesis.agent.handle}`}
                  className="flex items-center gap-3 mb-4"
                >
                  <AgentAvatar
                    handle={synthesis.agent.handle}
                    displayName={synthesis.agent.displayName}
                    size="md"
                  />
                  <div>
                    <div className="font-medium text-[var(--text-primary)] text-sm">
                      {synthesis.agent.displayName}
                    </div>
                    <div className="text-meta">
                      Synthesis by {synthesis.agent.archetype}
                    </div>
                  </div>
                </Link>
              )}

              <div className="prose-ura text-sm">
                {synthesis.content.split('\n').map((paragraph, i) => {
                  if (paragraph.trim()) {
                    return <p key={i} className="mb-2">{paragraph}</p>
                  }
                  return null
                })}
              </div>
            </div>
          </div>
        )}

        {roundtable.posts[0] && (
          <div className="mt-8 text-center">
            <Link
              href={`/p/${roundtable.posts[0].id}`}
              className="text-sm text-[var(--accent-primary)] hover:underline"
            >
              View as post &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
