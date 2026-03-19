import type { SourceProvider, SourceResult } from './types'

// RSS feeds — add new sources here as { url, publisher } entries
const DEFAULT_RSS_FEEDS: { url: string; publisher: string }[] = [
  // Hip Hop
  { url: 'https://www.xxlmag.com/feed/', publisher: 'XXL Magazine' },
  { url: 'https://www.hotnewhiphop.com/feed', publisher: 'HotNewHipHop' },
  { url: 'https://allhiphop.com/feed/', publisher: 'AllHipHop' },
  { url: 'https://thesource.com/feed/', publisher: 'The Source' },
  { url: 'https://hiphopdx.com/rss/news.xml', publisher: 'HipHopDX' },
  { url: 'https://rapradar.com/feed/', publisher: 'Rap Radar' },
  { url: 'https://hiphopwired.com/feed/', publisher: 'Hip Hop Wired' },
  { url: 'https://hiphop-n-more.com/feed/', publisher: 'Hip Hop-N-More' },
  { url: 'https://www.2dopeboyz.com/feed/', publisher: '2DopeBoyz' },
  { url: 'https://ambrosiaforheads.com/feed/', publisher: 'Ambrosia For Heads' },
  { url: 'https://www.passionweiss.com/feed/', publisher: 'Passion of the Weiss' },
  { url: 'https://www.elevator.world/feed/', publisher: 'ELEVATOR' },

  // R&B / Soul
  { url: 'https://thisisrnb.com/feed/', publisher: 'ThisIsRnB' },
  { url: 'https://youknowigotsoul.com/feed', publisher: 'YouKnowIGotSoul' },
  { url: 'https://www.rap-up.com/feed/', publisher: 'Rap-Up' },
  { url: 'https://www.soulinstereo.com/feed', publisher: 'Soul In Stereo' },

  // Broader music (strong hip hop & R&B coverage)
  { url: 'https://pitchfork.com/feed/feed-news/rss', publisher: 'Pitchfork' },
  { url: 'https://www.billboard.com/feed/', publisher: 'Billboard' },
  { url: 'https://www.vibe.com/feed/', publisher: 'VIBE' },
  { url: 'https://www.thefader.com/feed.rss', publisher: 'The FADER' },
  { url: 'https://www.stereogum.com/feed/', publisher: 'Stereogum' },
  { url: 'https://uproxx.com/music/feed/', publisher: 'Uproxx Music' },
  { url: 'https://djbooth.net/feed', publisher: 'DJBooth' },
]

interface RSSItem {
  title: string
  link: string
  description: string
  pubDate?: string
  publisher: string
  isSubstack: boolean
}

export class RSSProvider implements SourceProvider {
  name = 'rss'
  private feeds: { url: string; publisher: string }[]

  constructor(feeds?: { url: string; publisher: string }[]) {
    if (feeds && feeds.length > 0) {
      this.feeds = [...DEFAULT_RSS_FEEDS, ...feeds]
    } else {
      this.feeds = DEFAULT_RSS_FEEDS
    }
  }

  async search(query: string, limit = 5): Promise<SourceResult[]> {
    const allItems: RSSItem[] = []

    // Fetch from all configured feeds
    const feedPromises = this.feeds.map(feed => this.fetchFeed(feed))
    const feedResults = await Promise.allSettled(feedPromises)

    for (const result of feedResults) {
      if (result.status === 'fulfilled' && result.value) {
        allItems.push(...result.value)
      }
    }

    // Filter by query (simple keyword matching)
    const queryWords = query.toLowerCase().split(/\s+/)
    const filteredItems = allItems.filter(item => {
      const text = `${item.title} ${item.description}`.toLowerCase()
      return queryWords.some(word => text.includes(word))
    })

    // Sort by date (newest first)
    filteredItems.sort((a, b) => {
      const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0
      const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0
      return dateB - dateA
    })

    // Convert to SourceResult
    return filteredItems.slice(0, limit).map(item => ({
      title: item.title,
      url: item.link,
      snippet: this.cleanDescription(item.description),
      publisher: item.publisher,
      publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
      sourceType: 'rss' as const,
      metadata: item.isSubstack ? { substack: true } : undefined
    }))
  }

  async fetchAll(limit = 100): Promise<SourceResult[]> {
    const allItems: RSSItem[] = []

    const feedPromises = this.feeds.map(feed => this.fetchFeed(feed))
    const feedResults = await Promise.allSettled(feedPromises)

    for (const result of feedResults) {
      if (result.status === 'fulfilled' && result.value) {
        allItems.push(...result.value)
      }
    }

    // Only keep stories from the last 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    const recent = allItems.filter(item => {
      if (!item.pubDate) return true // keep items without dates (assume recent)
      const pubTime = new Date(item.pubDate).getTime()
      return pubTime > sevenDaysAgo
    })

    recent.sort((a, b) => {
      const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0
      const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0
      return dateB - dateA
    })

    return recent.slice(0, limit).map(item => ({
      title: item.title,
      url: item.link,
      snippet: this.cleanDescription(item.description),
      publisher: item.publisher,
      publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
      sourceType: 'rss' as const,
      metadata: item.isSubstack ? { substack: true } : undefined
    }))
  }

  private static isSubstackFeed(url: string): boolean {
    return url.includes('.substack.com/')
  }

  private async fetchFeed(feed: { url: string; publisher: string }): Promise<RSSItem[]> {
    try {
      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'plustrust/1.0 (AI Social Network)'
        }
      })

      if (!response.ok) {
        console.error(`RSS fetch failed for ${feed.publisher}:`, response.status)
        return []
      }

      const xml = await response.text()
      return this.parseRSS(xml, feed.publisher, RSSProvider.isSubstackFeed(feed.url))
    } catch (error) {
      console.error(`RSS fetch error for ${feed.publisher}:`, error)
      return []
    }
  }

  private parseRSS(xml: string, publisher: string, isSubstack = false): RSSItem[] {
    const items: RSSItem[] = []

    // Simple regex-based XML parsing (works for most RSS feeds)
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi
    let match

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1]

      const title = this.extractTag(itemXml, 'title')
      const link = this.extractTag(itemXml, 'link')
      const description = this.extractTag(itemXml, 'description')
      const pubDate = this.extractTag(itemXml, 'pubDate')

      if (title && link) {
        items.push({
          title,
          link,
          description: description || '',
          pubDate,
          publisher,
          isSubstack
        })
      }
    }

    return items
  }

  private extractTag(xml: string, tag: string): string {
    // Try CDATA first
    const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i')
    const cdataMatch = xml.match(cdataRegex)
    if (cdataMatch) {
      return cdataMatch[1].trim()
    }

    // Try regular content
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
    const match = xml.match(regex)
    if (match) {
      return this.decodeHTML(match[1].trim())
    }

    return ''
  }

  private decodeHTML(html: string): string {
    return html
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]*>/g, '') // Strip HTML tags
  }

  private cleanDescription(description: string): string {
    // Remove HTML tags and truncate
    const clean = description.replace(/<[^>]*>/g, '').trim()
    if (clean.length > 300) {
      return clean.substring(0, 300) + '...'
    }
    return clean
  }
}
