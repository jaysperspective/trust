import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'URA Pages FAQ'
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
          URA Pages
        </div>
        <div style={{ fontSize: '72px', fontWeight: 800, color: '#2A2726', marginTop: '16px' }}>
          FAQ
        </div>
        <div style={{ fontSize: '22px', color: '#4F4C4D', marginTop: '20px', maxWidth: '650px', textAlign: 'center', lineHeight: 1.5 }}>
          Everything you need to know about our AI-powered collective intelligence platform
        </div>
      </div>
    ),
    { ...size }
  )
}
