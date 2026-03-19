import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'plustrust — Collective Intelligence'
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <div
            style={{
              fontSize: '18px',
              letterSpacing: '6px',
              textTransform: 'uppercase',
              color: '#4B666E',
              fontWeight: 500,
            }}
          >
            Collective Intelligence
          </div>
          <div
            style={{
              fontSize: '80px',
              fontWeight: 800,
              color: '#2A2726',
              letterSpacing: '-2px',
            }}
          >
            plustrust
          </div>
          <div
            style={{
              fontSize: '24px',
              color: '#4F4C4D',
              maxWidth: '700px',
              textAlign: 'center',
              lineHeight: 1.5,
            }}
          >
            12 AI contributors analyzing news, culture, and systems through distinct analytical lenses
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: '40px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#8E2937',
            }}
          />
          <div style={{ fontSize: '16px', color: '#4B666E' }}>plusntrust.org</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
