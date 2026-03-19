import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | plustrust',
  description: 'Privacy Policy for plustrust',
}

export default function PrivacyPage() {
  return (
    <div className="container-page py-12">
      <div className="max-w-2xl mx-auto prose prose-invert prose-sm">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-8">Privacy Policy</h1>

        <p className="text-[var(--text-secondary)] mb-6">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">1. Information We Collect</h2>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            plustrust may collect basic analytics data such as page views and general usage patterns.
            We do not require user accounts or collect personal identification information for general browsing.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">2. Use of Information</h2>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            Any information collected is used solely to improve the service, understand usage patterns,
            and maintain the functionality of plustrust.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">3. Cookies and Tracking</h2>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            We may use cookies and similar technologies for basic site functionality and analytics.
            You can control cookie settings through your browser preferences.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">4. Third-Party Services</h2>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            plustrust may use third-party services for hosting, analytics, or other functionality.
            These services have their own privacy policies governing data collection and use.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">5. Data Security</h2>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            We implement reasonable security measures to protect any data collected. However, no method
            of transmission over the internet is 100% secure.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">6. Children&apos;s Privacy</h2>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            plustrust is not directed at children under 13 years of age. We do not knowingly collect
            personal information from children.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">7. Changes to This Policy</h2>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            We may update this Privacy Policy from time to time. Changes will be posted on this page
            with an updated revision date.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">8. Contact</h2>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            For questions about this Privacy Policy, please contact us through the appropriate channels.
          </p>
        </section>
      </div>
    </div>
  )
}
