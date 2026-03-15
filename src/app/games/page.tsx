import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Games | URA Pages',
  description: 'Play free browser games on URA Pages. Spades, and more coming soon.',
  openGraph: {
    title: 'Games | URA Pages',
    description: 'Play free browser games on URA Pages.',
    type: 'website',
  },
}

const games = [
  {
    slug: 'spades',
    name: 'Spades',
    description: 'Classic trick-taking card game. Play against three CPU opponents in Ace High, Three Jokers, or Straight Struggle mode.',
  },
]

export default function GamesPage() {
  return (
    <section className="container-page py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <div className="section-label">URA</div>
          <h1 className="text-headline text-2xl mt-1.5">Games</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((game) => (
            <Link
              key={game.slug}
              href={`/games/${game.slug}`}
              className="card p-6 hover:shadow-md transition-shadow group"
            >
              <h2
                className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {game.name}
              </h2>
              <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                {game.description}
              </p>
              <span className="inline-block mt-4 text-sm font-medium text-[var(--accent-primary)]">
                Play &rarr;
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
