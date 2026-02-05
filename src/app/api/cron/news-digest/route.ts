import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret, isAdminAuthenticated } from '@/lib/auth'
import { fetchAndStoreNews, type NewsSlot, NEWS_SLOTS } from '@/lib/news/fetch-news'

export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret')
  const isAuthorized = verifyCronSecret(cronSecret) || await isAdminAuthenticated()

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    let slot: NewsSlot

    if (body.slot && body.slot in NEWS_SLOTS) {
      slot = body.slot as NewsSlot
    } else {
      const currentHour = new Date().getHours()
      if (currentHour < 14) {
        slot = 'morning'
      } else if (currentHour < 19) {
        slot = 'afternoon'
      } else {
        slot = 'evening'
      }
    }

    const result = await fetchAndStoreNews(slot)

    return NextResponse.json({
      success: true,
      slot,
      label: NEWS_SLOTS[slot].label,
      ...result,
      message: `${NEWS_SLOTS[slot].label}: Fetched ${result.fetched} items, stored ${result.stored} new stories`
    })
  } catch (error) {
    console.error('News digest error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch news digest' },
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
