import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { DownloadButton } from '@/components/downloads/download-button'

export const metadata: Metadata = {
  title: 'DigitalSov | URA Pages',
  description: 'A local-first personal finance audit tool. Import bank statements, categorize transactions, and generate reports — entirely offline.',
}

const DRIVE_URL = 'https://drive.google.com/uc?export=download&id=12wz2IOo5Edsjch5C1Ctk7SnckM_fuf7k'
const ACCENT = '#617FAE'
const ACCENT_HOVER = '#4B666E'

const features = [
  { label: 'Import', desc: 'CSV, PDF statements, and PayPal exports from any major bank or card issuer' },
  { label: 'Transactions', desc: 'Categorize spending with rules — or manually edit in bulk' },
  { label: 'Dashboard', desc: 'Spending summaries, trend charts, and period-over-period comparisons' },
  { label: 'Audit', desc: 'Flags unusual transactions, spending spikes, and anomalies automatically' },
  { label: 'Tax Summary', desc: 'Organize deductible expenses and prepare data for tax season' },
  { label: 'AI Assistant', desc: 'Optional local AI via Ollama — no data ever leaves your device' },
]

const screenshots = [
  { src: '/downloads/digitalsov/capture1.png', alt: 'DigitalSov profile selection' },
  { src: '/downloads/digitalsov/capture2.png', alt: 'DigitalSov dashboard' },
  { src: '/downloads/digitalsov/capture3.png', alt: 'DigitalSov import screen' },
  { src: '/downloads/digitalsov/capture4.png', alt: 'DigitalSov transactions view' },
  { src: '/downloads/digitalsov/capture5.png', alt: 'DigitalSov AI assistant' },
]

const installStepsMac = [
  'Open DigitalSov-1.0.0-macOS.dmg',
  'Drag DigitalSov.app into your Applications folder',
  'Eject the disk image',
  'Open Finder, navigate to Applications',
  'Right-click DigitalSov.app and choose Open',
  'Click Open in the security dialog (required once)',
]

const installStepsWindows = [
  'Run DigitalSov-1.0.0-Windows-Setup.exe',
  'If Windows SmartScreen appears, click "More info" then "Run anyway"',
  'Follow the installer prompts',
  'Launch DigitalSov from the Start Menu or Desktop shortcut',
]

export default function DigitalSovPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">

      {/* Back link */}
      <div className="container-page pt-8">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/downloads"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            All Apps
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="container-page pt-8 pb-12">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-6">
          <Image
            src="/downloads/digitalsov/icon.svg"
            alt="DigitalSov icon"
            width={96}
            height={96}
            className="rounded-2xl shadow-lg"
          />

          <div>
            <h1 className="font-mono text-4xl font-bold" style={{ color: ACCENT }}>DigitalSov</h1>
            <p className="mt-1 text-xs font-mono text-[var(--text-muted)] tracking-widest uppercase">v1.0.0 · macOS · Windows</p>
          </div>

          <p className="text-[var(--text-secondary)] text-base leading-relaxed max-w-md">
            A personal finance audit tool that runs entirely on your computer. Import bank statements, categorize transactions, and generate reports — all offline. Your data never leaves your machine.
          </p>

          <DownloadButton label="Download DigitalSov" url={DRIVE_URL} color={ACCENT} hoverColor={ACCENT_HOVER} />

          <p className="text-xs text-[var(--text-muted)]">Free · No account required · macOS &amp; Windows</p>
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

      {/* Features */}
      <section className="container-page py-10 border-t border-[var(--border-subtle)]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-sm font-mono text-[var(--text-muted)] uppercase tracking-widest mb-6">Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((f) => (
              <div key={f.label} className="p-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
                <div className="font-mono font-semibold text-sm mb-1" style={{ color: ACCENT }}>{f.label}</div>
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Installation */}
      <section className="container-page py-10 border-t border-[var(--border-subtle)]">
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-sm font-mono text-[var(--text-muted)] uppercase tracking-widest">Installation</h2>

          <div>
            <h3 className="font-mono text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-4">macOS</h3>
            <ol className="space-y-3">
              {installStepsMac.map((step, i) => (
                <li key={i} className="flex gap-4 items-start">
                  <span className="font-mono text-xs mt-0.5 w-4 shrink-0" style={{ color: ACCENT }}>{i + 1}.</span>
                  <span className="text-sm text-[var(--text-secondary)] leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h3 className="font-mono text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-4">Windows</h3>
            <ol className="space-y-3">
              {installStepsWindows.map((step, i) => (
                <li key={i} className="flex gap-4 items-start">
                  <span className="font-mono text-xs mt-0.5 w-4 shrink-0" style={{ color: ACCENT }}>{i + 1}.</span>
                  <span className="text-sm text-[var(--text-secondary)] leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Security notice */}
      <section className="container-page py-10 border-t border-[var(--border-subtle)]">
        <div className="max-w-2xl mx-auto">
          <div className="p-5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
            <h3 className="font-mono text-sm font-semibold text-[var(--text-primary)] mb-3">macOS Security Notice</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Because DigitalSov is not distributed through the Mac App Store, macOS will warn you on first launch. Right-clicking the app and choosing <span className="font-mono text-[var(--text-primary)]">Open</span> permanently grants an exception for your account — you will not see the warning again.
            </p>
          </div>
        </div>
      </section>

      {/* Data location */}
      <section className="container-page py-10 border-t border-[var(--border-subtle)]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-sm font-mono text-[var(--text-muted)] uppercase tracking-widest mb-6">Your Data</h2>
          <div className="space-y-3">
            <div className="p-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
              <div className="font-mono font-semibold text-sm text-[var(--text-primary)] mb-1">macOS</div>
              <div className="text-xs font-mono text-[var(--text-muted)]">~/Library/Application Support/DigitalSov/profiles/</div>
            </div>
            <div className="p-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)]">
              <div className="font-mono font-semibold text-sm text-[var(--text-primary)] mb-1">Windows</div>
              <div className="text-xs font-mono text-[var(--text-muted)]">C:\Users\&lt;you&gt;\AppData\Roaming\DigitalSov\profiles\</div>
            </div>
          </div>
          <p className="mt-4 text-xs text-[var(--text-secondary)] leading-relaxed">
            Each profile is a standard SQLite file. Back it up, copy it, or move it like any other file. DigitalSov will never touch these files without your direct action inside the app.
          </p>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="container-page py-16 border-t border-[var(--border-subtle)]">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
          <DownloadButton label="Download DigitalSov" url={DRIVE_URL} color={ACCENT} hoverColor={ACCENT_HOVER} />
          <p className="text-xs text-[var(--text-muted)]">Free · No account required · macOS &amp; Windows</p>
        </div>
      </section>

    </div>
  )
}
