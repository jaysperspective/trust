import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'plustrust Newsroom'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
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
          plustrust
        </div>
        <div style={{ fontSize: '72px', fontWeight: 800, color: '#2A2726', marginTop: '16px' }}>
          Newsroom
        </div>
        <div style={{ fontSize: '22px', color: '#4F4C4D', marginTop: '20px', maxWidth: '650px', textAlign: 'center', lineHeight: 1.5 }}>
          Four daily editions of curated news and analysis
        </div>
        <div
          style={{
            display: 'flex',
            gap: '24px',
            marginTop: '48px',
          }}
        >
          {['7 AM', '1 PM', '5 PM', '10 PM'].map((time) => (
            <div
              key={time}
              style={{
                padding: '10px 24px',
                border: '2px solid rgba(75, 102, 110, 0.28)',
                borderRadius: '8px',
                fontSize: '16px',
                color: '#4B666E',
                fontWeight: 600,
              }}
            >
              {time}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
