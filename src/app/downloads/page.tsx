import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Apps | plustrust',
  description: 'Free, local-first software for your Mac. No accounts, no subscriptions.',
}

const apps = [
  {
    slug: 'app',
    name: '+downloads',
    tagline: 'Download music and video from the web',
    description: 'YouTube, SoundCloud, Spotify, Apple Music — saved locally as MP3, MP4, or M4A. Runs entirely on your Mac.',
    icon: '/downloads/downloadsicon.png',
    version: 'v1.3',
    platform: 'macOS',
    category: 'Media',
    color: '#8E2937',
  },
  {
    slug: 'digitalsov',
    name: 'DigitalSov',
    tagline: 'Personal finance audit — your data, your machine',
    description: 'Import bank statements, categorize transactions, detect patterns, and generate reports entirely offline.',
    icon: '/downloads/digitalsov/icon.svg',
    version: 'v1.0.0',
    platform: 'macOS · Windows',
    category: 'Finance',
    color: '#617FAE',
  },
]

export default function DownloadsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Header */}
      <section className="container-page pt-16 pb-10">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-widest mb-3">plustrust</p>
          <h1 className="text-3xl font-mono font-bold text-[var(--text-primary)]">Apps</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Free, local-first software. No accounts, no subscriptions, no data leaving your machine.
          </p>
        </div>
      </section>

      {/* App grid */}
      <section className="container-page pb-20 border-t border-[var(--border-subtle)]">
        <div className="max-w-3xl mx-auto pt-10 flex flex-col gap-4">
          {apps.map((app) => (
            <Link
              key={app.slug}
              href={`/downloads/${app.slug}`}
              className="group flex items-start gap-5 p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] hover:border-[var(--border-hover)] transition-all duration-200"
            >
              {/* Icon */}
              <div className="shrink-0">
                <Image
                  src={app.icon}
                  alt={`${app.name} icon`}
                  width={64}
                  height={64}
                  className="rounded-xl shadow-md"
                />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-base" style={{ color: app.color }}>{app.name}</span>
                  <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--bg-base)] border border-[var(--border-subtle)] px-2 py-0.5 rounded-full">{app.category}</span>
                </div>
                <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">{app.version} · {app.platform}</p>
                <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">{app.description}</p>
              </div>

              {/* Arrow */}
              <div className="shrink-0 self-center text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors duration-200">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
