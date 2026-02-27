import { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
  title: '+downloads | URA Pages',
  description: 'A local media downloader for YouTube, SoundCloud, Spotify, and Apple Music — runs entirely on your Mac.',
}

const features = [
  {
    label: 'YouTube',
    desc: 'Video or playlist — MP4 or MP3',
  },
  {
    label: 'SoundCloud',
    desc: 'Track or playlist — M4A or MP3',
  },
  {
    label: 'Spotify',
    desc: 'Track, album, or playlist — matched to YouTube and saved as MP3',
  },
  {
    label: 'Apple Music',
    desc: 'Track or album — matched to YouTube with metadata embedded',
  },
]

const screenshots = [
  { src: '/downloads/capture_1.png', alt: '+downloads main UI' },
  { src: '/downloads/capture_3.png', alt: '+downloads format picker' },
  { src: '/downloads/capture_4.png', alt: '+downloads burn to CD' },
]

const installSteps = [
  'Download and unzip +downloads.zip',
  'Move +downloads.app to your Applications folder (optional but recommended)',
  'Double-click to open — your browser will open automatically at http://127.0.0.1:5055',
]

const securitySteps = [
  'Click Done on the warning dialog (do not click Move to Trash)',
  'Open System Settings → Privacy & Security',
  'Scroll to the Security section and click Open Anyway',
  'Confirm by clicking Open in the next dialog',
]

function DownloadButton({ label }: { label: string }) {
  return (
    <a
      href="/downloads/+downloads.zip"
      download
      className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-lg font-mono font-semibold text-sm text-white bg-[#e05cb8] hover:bg-[#c94ea0] transition-colors duration-200"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 1v9M4 7l4 4 4-4M2 13h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {label}
    </a>
  )
}

export default function DownloadsAppPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">

      {/* Hero */}
      <section className="container-page pt-16 pb-12">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-6">
          <Image
            src="/downloads/downloadsicon.png"
            alt="+downloads icon"
            width={96}
            height={96}
            className="rounded-2xl shadow-lg"
          />

          <div>
            <h1 className="font-mono text-4xl font-bold text-[#e05cb8]">+downloads</h1>
            <p className="mt-1 text-xs font-mono text-[var(--text-muted)] tracking-widest uppercase">v1.3 · macOS</p>
          </div>

          <p className="text-[var(--text-secondary)] text-base leading-relaxed max-w-md">
            A local media downloader for YouTube, SoundCloud, Spotify, and Apple Music. Runs entirely on your Mac — no account, no subscription.
          </p>

          <DownloadButton label="Download for Mac" />

          <p className="text-xs text-[var(--text-muted)]">Free · No sign-in required</p>
        </div>
      </section>

      {/* Screenshots */}
      <section className="container-page py-10 border-t border-[var(--border-subtle)]">
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-4">
            {screenshots.map((s) => (
              <div key={s.src} className="rounded-xl overflow-hidden border border-[var(--border-subtle)] shadow-md">
                <Image
                  src={s.src}
                  alt={s.alt}
                  width={1440}
                  height={900}
                  className="w-full h-auto"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Supported sources */}
      <section className="container-page py-10 border-t border-[var(--border-subtle)]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-sm font-mono text-[var(--text-muted)] uppercase tracking-widest mb-6">Supported Sources</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((f) => (
              <div key={f.label} className="p-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
                <div className="font-mono font-semibold text-sm text-[#e05cb8] mb-1">{f.label}</div>
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Installation */}
      <section className="container-page py-10 border-t border-[var(--border-subtle)]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-sm font-mono text-[var(--text-muted)] uppercase tracking-widest mb-6">Installation</h2>
          <ol className="space-y-3">
            {installSteps.map((step, i) => (
              <li key={i} className="flex gap-4 items-start">
                <span className="font-mono text-xs text-[#e05cb8] mt-0.5 w-4 shrink-0">{i + 1}.</span>
                <span className="text-sm text-[var(--text-secondary)] leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* macOS security notice */}
      <section className="container-page py-10 border-t border-[var(--border-subtle)]">
        <div className="max-w-2xl mx-auto">
          <div className="p-5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
            <h3 className="font-mono text-sm font-semibold text-[var(--text-primary)] mb-3">macOS Security Warning</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
              The first time you open the app, macOS may block it because it&apos;s not from the App Store. To allow it:
            </p>
            <ol className="space-y-2">
              {securitySteps.map((step, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="font-mono text-xs text-[var(--text-muted)] mt-0.5 w-4 shrink-0">{i + 1}.</span>
                  <span className="text-xs text-[var(--text-secondary)] leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="container-page py-16 border-t border-[var(--border-subtle)]">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
          <DownloadButton label="Download +downloads" />
          <p className="text-xs text-[var(--text-muted)]">macOS · Free · No account needed</p>
        </div>
      </section>

    </div>
  )
}
