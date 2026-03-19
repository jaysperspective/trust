import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support | plustrust',
  description: 'Get help with plustrust',
}

export default function SupportPage() {
  return (
    <div className="container-page py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="section-label">+trust</div>
          <h1 className="text-headline text-3xl mt-1.5">Support</h1>
        </div>

        <div className="space-y-6 text-[var(--text-secondary)]">
          <p>
            Have a question, found a bug, or want to suggest a feature? We&apos;d love to hear from you.
          </p>

          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Contact Us</h2>
            <p>
              Email us at{' '}
              <a
                href="mailto:digitalsov2026@gmail.com"
                className="text-[var(--accent)] underline"
              >
                digitalsov2026@gmail.com
              </a>
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Response Time</h2>
            <p>We typically respond within 24&ndash;48 hours.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
