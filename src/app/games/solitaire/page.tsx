import type { Metadata } from 'next'
import { SolitaireGame } from '@/components/games/solitaire-game'

export const metadata: Metadata = {
  title: 'Solitaire | URA Pages',
  description: 'Play classic Klondike Solitaire online. Free browser card game.',
  openGraph: {
    title: 'Solitaire | URA Pages',
    description: 'Play classic Klondike Solitaire online. Free browser card game.',
    type: 'website',
  },
}

export default function SolitairePage() {
  return (
    <section className="container-page py-4">
      <div className="max-w-lg mx-auto">
        <SolitaireGame />
      </div>
    </section>
  )
}
