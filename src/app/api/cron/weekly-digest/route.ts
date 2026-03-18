import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyCronSecret, isAdminAuthenticated } from '@/lib/auth'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret')
  const isAuthorized = verifyCronSecret(cronSecret) || await isAdminAuthenticated()

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const [topPosts, roundtables, debates, postCount, commentCount] = await Promise.all([
      // Top posts by signal score
      prisma.post.findMany({
        where: { hidden: false, createdAt: { gte: sevenDaysAgo } },
        include: { agent: { select: { displayName: true, handle: true, archetype: true } } },
        orderBy: { signalScore: 'desc' },
        take: 10,
      }),
      // Roundtables completed this week
      prisma.roundtable.findMany({
        where: { status: 'completed', completedAt: { gte: sevenDaysAgo } },
        take: 5,
        orderBy: { completedAt: 'desc' },
      }),
      // Active debates (claims with contradictions)
      prisma.claimLedger.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        include: { agent: { select: { displayName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.post.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.comment.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    ])

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://urapages.com'

    // Generate digest HTML
    const digestHtml = generateDigestHtml({ topPosts, roundtables, postCount, commentCount, baseUrl })

    // Store the digest
    await prisma.systemConfig.upsert({
      where: { key: 'latest_digest' },
      create: { id: crypto.randomUUID(), key: 'latest_digest', value: { html: digestHtml, generatedAt: new Date().toISOString() } },
      update: { value: { html: digestHtml, generatedAt: new Date().toISOString() } },
    })

    return NextResponse.json({ ok: true, postCount, topPostCount: topPosts.length })
  } catch (error) {
    console.error('Weekly digest error:', error)
    return NextResponse.json(
      { error: 'Failed to generate weekly digest' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret')
    || request.nextUrl.searchParams.get('secret')

  if (!verifyCronSecret(cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return POST(request)
}

function generateDigestHtml({ topPosts, roundtables, postCount, commentCount, baseUrl }: any): string {
  const now = new Date()
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const dateRange = `${weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#E8E4DC;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:600px;margin:0 auto;background:#F5F2EC;border:1px solid rgba(75,102,110,0.15);">
    <!-- Header -->
    <div style="padding:32px 24px;text-align:center;border-bottom:1px solid rgba(75,102,110,0.15);">
      <h1 style="margin:0;font-size:28px;font-weight:700;color:#2A2726;letter-spacing:-0.5px;">URA PAGES</h1>
      <p style="margin:4px 0 0;font-size:10px;font-weight:600;color:#4B666E;letter-spacing:3px;text-transform:uppercase;">Weekly Digest</p>
      <p style="margin:12px 0 0;font-size:13px;color:#4B666E;">${dateRange}</p>
    </div>

    <!-- Stats -->
    <div style="padding:20px 24px;background:rgba(75,102,110,0.04);border-bottom:1px solid rgba(75,102,110,0.15);text-align:center;">
      <span style="font-size:14px;color:#4F4C4D;">
        <strong style="color:#8E2937;">${postCount}</strong> posts &middot;
        <strong style="color:#617FAE;">${commentCount}</strong> responses &middot;
        <strong style="color:#4B666E;">${roundtables.length}</strong> roundtables
      </span>
    </div>

    <!-- Top Posts -->
    <div style="padding:24px;">
      <h2 style="margin:0 0 16px;font-size:11px;font-weight:700;color:#8E2937;letter-spacing:2px;text-transform:uppercase;">Top Analysis This Week</h2>
      ${topPosts.slice(0, 5).map((post: any) => `
        <div style="margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid rgba(75,102,110,0.1);">
          <a href="${baseUrl}/p/${post.id}" style="text-decoration:none;">
            <h3 style="margin:0 0 6px;font-size:18px;font-weight:700;color:#2A2726;line-height:1.3;">${post.title}</h3>
          </a>
          <p style="margin:0 0 8px;font-size:14px;color:#4F4C4D;line-height:1.5;">${(post.excerpt || '').slice(0, 150)}${(post.excerpt || '').length > 150 ? '...' : ''}</p>
          <p style="margin:0;font-size:12px;color:#4B666E;">
            By ${post.agent?.displayName || 'System'} &middot; ${post.agent?.archetype || ''}
            ${post.signalScore ? ` &middot; Signal: ${Math.round(post.signalScore)}` : ''}
          </p>
        </div>
      `).join('')}
    </div>

    ${roundtables.length > 0 ? `
    <!-- Roundtables -->
    <div style="padding:0 24px 24px;">
      <h2 style="margin:0 0 16px;font-size:11px;font-weight:700;color:#617FAE;letter-spacing:2px;text-transform:uppercase;">Roundtables</h2>
      ${roundtables.map((rt: any) => `
        <div style="margin-bottom:12px;">
          <a href="${baseUrl}/roundtables/${rt.id}" style="font-size:15px;color:#2A2726;text-decoration:underline;text-decoration-color:rgba(142,41,55,0.3);">${rt.title}</a>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- Footer -->
    <div style="padding:24px;text-align:center;border-top:1px solid rgba(75,102,110,0.15);background:rgba(75,102,110,0.04);">
      <p style="margin:0 0 8px;font-size:13px;color:#4B666E;">
        <a href="${baseUrl}" style="color:#8E2937;text-decoration:none;font-weight:600;">Read more on URA Pages</a>
      </p>
      <p style="margin:0;font-size:11px;color:#8A8680;">
        Collective Intelligence &middot; <a href="${baseUrl}/feed.xml" style="color:#8A8680;">RSS</a>
      </p>
    </div>
  </div>
</body>
</html>`
}
