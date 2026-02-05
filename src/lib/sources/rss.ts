import type { SourceProvider, SourceResult } from './types'

// Default RSS feeds from reputable outlets
const DEFAULT_RSS_FEEDS = [
  // Major wire services & newspapers
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', publisher: 'BBC News' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', publisher: 'New York Times' },
  { url: 'https://feeds.npr.org/1001/rss.xml', publisher: 'NPR' },
  { url: 'https://www.theguardian.com/world/rss', publisher: 'The Guardian' },
  { url: 'https://www.ft.com/rss/home', publisher: 'Financial Times' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', publisher: 'Al Jazeera' },
  { url: 'https://feeds.reuters.com/reuters/topNews', publisher: 'Reuters' },
  { url: 'https://feeds.bloomberg.com/markets/news.rss', publisher: 'Bloomberg' },

  // Research
  { url: 'https://www.pewresearch.org/feed', publisher: 'Pew Research Center' },

  // Black journalism
  { url: 'https://www.theroot.com/rss', publisher: 'The Root' },
  { url: 'https://thegrio.com/feed', publisher: 'TheGrio' },
  { url: 'https://www.essence.com/feed', publisher: 'Essence' },
  { url: 'https://capitalbnews.org/feed', publisher: 'Capital B News' },
  { url: 'https://atlantablackstar.com/feed', publisher: 'Atlanta Black Star' },
  { url: 'https://blavity.com/feed', publisher: 'Blavity' },

  // Space & science
  { url: 'https://www.space.com/feeds/all', publisher: 'Space.com' },
  { url: 'https://spacenews.com/feed', publisher: 'SpaceNews' },
  { url: 'https://www.nasa.gov/news-release/feed/', publisher: 'NASA' },
  { url: 'https://feeds.arstechnica.com/arstechnica/science', publisher: 'Ars Technica' },
]

interface RSSItem {
  title: string
  link: string
  description: string
  pubDate?: string
  publisher: string
}

export class RSSProvider implements SourceProvider {
  name = 'rss'
  private feeds: { url: string; publisher: string }[]

  constructor(feeds?: { url: string; publisher: string }[]) {
    this.feeds = feeds || DEFAULT_RSS_FEEDS
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
      sourceType: 'rss' as const
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
      sourceType: 'rss' as const
    }))
  }

  private async fetchFeed(feed: { url: string; publisher: string }): Promise<RSSItem[]> {
    try {
      const response = await fetch(feed.url, {
        headers: {
          'User-Agent': 'URAPages/1.0 (AI Social Network)'
        }
      })

      if (!response.ok) {
        console.error(`RSS fetch failed for ${feed.publisher}:`, response.status)
        return []
      }

      const xml = await response.text()
      return this.parseRSS(xml, feed.publisher)
    } catch (error) {
      console.error(`RSS fetch error for ${feed.publisher}:`, error)
      return []
    }
  }

  private parseRSS(xml: string, publisher: string): RSSItem[] {
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
          publisher
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
