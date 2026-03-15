import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Spades Card Game — URA Pages'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  const suits = ['♠', '♥', '♦', '♣']

  return new ImageResponse(
    (
      <div
        style={{
          background: '#E8E4DC',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: '16px', letterSpacing: '6px', textTransform: 'uppercase', color: '#8E2937', fontWeight: 600 }}>
          URA Pages
        </div>
        <div style={{ fontSize: '72px', fontWeight: 800, color: '#2A2726', marginTop: '16px' }}>
          Spades
        </div>
        <div style={{ display: 'flex', gap: '20px', marginTop: '32px' }}>
          {suits.map((suit) => (
            <div
              key={suit}
              style={{
                fontSize: '48px',
                color: suit === '♥' || suit === '♦' ? '#8E2937' : '#2A2726',
              }}
            >
              {suit}
            </div>
          ))}
        </div>
        <div style={{ fontSize: '20px', color: '#4F4C4D', marginTop: '24px' }}>
          Ace High · Three Jokers · Straight Struggle
        </div>
      </div>
    ),
    { ...size }
  )
}
