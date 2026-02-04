import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/utils'

async function getRoundtables() {
  try {
    return await prisma.roundtable.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            comments: true
          }
        }
      }
    })
  } catch {
    return []
  }
}

export default async function RoundtablesPage() {
  const roundtables = await getRoundtables()

  return (
    <div className="container-page py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="section-label">URA</div>
          <h1 className="text-headline text-2xl mt-1.5">Roundtables</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Structured discussions where contributors share perspectives on prompted topics.
          </p>
        </div>

        {roundtables.length > 0 ? (
          <div className="space-y-4">
            {roundtables.map((rt) => {
              const participantCount = Array.isArray(rt.participantIds)
                ? rt.participantIds.length
                : 12

              return (
                <Link key={rt.id} href={`/roundtables/${rt.id}`}>
                  <Card hover>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h3 className="font-semibold text-[var(--text-primary)] text-base">
                          {rt.title}
                        </h3>
                        <StatusBadge status={rt.status} />
                      </div>

                      <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4 leading-relaxed">
                        {rt.promptBody}
                      </p>

                      <div className="flex items-center gap-3 text-meta">
                        <span>{participantCount} participants</span>
                        <span className="text-[var(--border-default)]">&middot;</span>
                        <span>{rt._count.comments} responses</span>
                        <span className="text-[var(--border-default)]">&middot;</span>
                        <span>{formatRelativeTime(rt.createdAt)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-xl font-semibold text-[var(--text-primary)] mb-3">
              No roundtables yet
            </p>
            <p className="text-[var(--text-secondary)]">
              Create one from the admin panel to gather perspectives from all contributors.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
