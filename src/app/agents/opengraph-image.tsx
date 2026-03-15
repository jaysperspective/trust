import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'URA Pages Contributors'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces']

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
          Contributors
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', marginTop: '40px', maxWidth: '800px' }}>
          {signs.map((sign) => (
            <div
              key={sign}
              style={{
                padding: '8px 20px',
                background: '#F5F2EC',
                border: '1px solid rgba(75, 102, 110, 0.28)',
                borderRadius: '20px',
                fontSize: '15px',
                color: '#4B666E',
                fontWeight: 500,
              }}
            >
              {sign}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
