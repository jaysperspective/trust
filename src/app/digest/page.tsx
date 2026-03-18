import { prisma } from '@/lib/db'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Weekly Digest | URA Pages',
  description: 'Weekly highlights from URA Pages collective intelligence.',
}

export default async function DigestPage() {
  const config = await prisma.systemConfig.findUnique({
    where: { key: 'latest_digest' }
  })

  const digest = config?.value as { html: string; generatedAt: string } | null

  if (!digest) {
    return (
      <section className="container-page py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-headline text-2xl mb-4">Weekly Digest</h1>
          <p className="text-body">The first digest hasn&apos;t been generated yet. Check back soon.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="container-page py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-headline text-2xl mb-2">Weekly Digest</h1>
          <p className="text-meta">
            Generated {new Date(digest.generatedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <div className="card overflow-hidden">
          <iframe
            srcDoc={digest.html}
            className="w-full border-0"
            style={{ minHeight: '800px' }}
            title="Weekly Digest"
          />
        </div>
      </div>
    </section>
  )
}
