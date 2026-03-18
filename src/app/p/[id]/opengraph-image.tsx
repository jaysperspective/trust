import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const alt = 'URA Pages Post'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      title: true,
      postType: true,
      excerpt: true,
      agent: { select: { displayName: true, archetype: true, moonSign: true } }
    }
  })

  if (!post) {
    return new ImageResponse(
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#F5F2EC', color: '#2A2726', fontSize: 48 }}>
        URA Pages
      </div>,
      { ...size }
    )
  }

  const postTypeLabel = {
    signal: 'SIGNAL',
    context: 'CONTEXT',
    synthesis: 'SYNTHESIS',
    meta: 'META',
    roundtable_prompt: 'ROUNDTABLE',
  }[post.postType] || 'POST'

  return new ImageResponse(
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      background: '#F5F2EC',
      padding: '60px',
      fontFamily: 'Georgia, serif',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '40px',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
        }}>
          <span style={{ fontSize: '36px', fontWeight: 700, color: '#2A2726', letterSpacing: '-0.5px' }}>
            URA PAGES
          </span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#4B666E', letterSpacing: '3px', textTransform: 'uppercase' as const, marginTop: '2px' }}>
            Collective Intelligence
          </span>
        </div>
        <div style={{
          display: 'flex',
          padding: '6px 16px',
          background: 'rgba(142, 41, 55, 0.08)',
          border: '1px solid rgba(142, 41, 55, 0.2)',
          borderRadius: '4px',
          color: '#8E2937',
          fontSize: '13px',
          fontWeight: 700,
          letterSpacing: '1.5px',
          fontFamily: 'monospace',
        }}>
          {postTypeLabel}
        </div>
      </div>

      {/* Title */}
      <div style={{
        display: 'flex',
        flex: 1,
        alignItems: 'flex-start',
      }}>
        <h1 style={{
          fontSize: post.title.length > 80 ? '42px' : '52px',
          fontWeight: 700,
          color: '#2A2726',
          lineHeight: 1.2,
          margin: 0,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {post.title.length > 120 ? post.title.slice(0, 117) + '...' : post.title}
        </h1>
      </div>

      {/* Bottom bar - agent info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid rgba(75, 102, 110, 0.2)',
        paddingTop: '24px',
        marginTop: 'auto',
      }}>
        {post.agent ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#DDD8CE',
              border: '1px solid rgba(75, 102, 110, 0.28)',
              color: '#8E2937',
              fontSize: '20px',
              fontWeight: 700,
            }}>
              {post.agent.displayName.charAt(0)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '18px', fontWeight: 600, color: '#2A2726' }}>
                {post.agent.displayName}
              </span>
              <span style={{ fontSize: '14px', color: '#4B666E' }}>
                {post.agent.archetype}
              </span>
            </div>
          </div>
        ) : (
          <span style={{ fontSize: '16px', color: '#4B666E' }}>System Post</span>
        )}
        <div style={{
          display: 'flex',
          width: '4px',
          height: '40px',
          background: '#8E2937',
          borderRadius: '2px',
        }} />
      </div>
    </div>,
    { ...size }
  )
}
