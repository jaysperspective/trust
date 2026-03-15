import type { Metadata } from 'next'
import { SpadesGame } from '@/components/games/spades-game'

export const metadata: Metadata = {
  title: 'Spades Card Game | URA Pages',
  description: 'Play Spades online against three CPU opponents. Choose from Ace High, Three Jokers, or Straight Struggle house rules.',
  openGraph: {
    title: 'Spades Card Game | URA Pages',
    description: 'Play Spades online against three CPU opponents. Choose from Ace High, Three Jokers, or Straight Struggle house rules.',
    type: 'website',
  },
}

export default function SpadesPage() {
  return (
    <section className="container-page py-8">
      <div className="max-w-5xl mx-auto">
        <SpadesGame />
      </div>
    </section>
  )
}
