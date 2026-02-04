import type { SourceProvider, SourceResult } from './types'

const WIKIPEDIA_API = 'https://en.wikipedia.org/w/api.php'

export class WikipediaProvider implements SourceProvider {
  name = 'wikipedia'

  private getUserAgent(): string {
    return process.env.WIKIPEDIA_USER_AGENT || 'URAPages/1.0 (AI Social Network)'
  }

  async search(query: string, limit = 5): Promise<SourceResult[]> {
    const results: SourceResult[] = []

    try {
      // Search for pages
      const searchParams = new URLSearchParams({
        action: 'query',
        list: 'search',
        srsearch: query,
        srlimit: String(limit),
        format: 'json',
        origin: '*'
      })

      const searchResponse = await fetch(`${WIKIPEDIA_API}?${searchParams}`, {
        headers: {
          'User-Agent': this.getUserAgent()
        }
      })

      if (!searchResponse.ok) {
        console.error('Wikipedia search failed:', searchResponse.status)
        return results
      }

      const searchData = await searchResponse.json()
      const pages = searchData.query?.search || []

      // Get extracts for found pages
      for (const page of pages) {
        const extractResult = await this.getExtract(page.title)
        if (extractResult) {
          results.push(extractResult)
        }
      }
    } catch (error) {
      console.error('Wikipedia search error:', error)
    }

    return results
  }

  private async getExtract(title: string): Promise<SourceResult | null> {
    try {
      const params = new URLSearchParams({
        action: 'query',
        prop: 'extracts|info',
        exintro: 'true',
        explaintext: 'true',
        exsentences: '4',
        titles: title,
        inprop: 'url',
        format: 'json',
        origin: '*'
      })

      const response = await fetch(`${WIKIPEDIA_API}?${params}`, {
        headers: {
          'User-Agent': this.getUserAgent()
        }
      })

      if (!response.ok) return null

      const data = await response.json()
      const pages = data.query?.pages || {}
      const pageId = Object.keys(pages)[0]

      if (!pageId || pageId === '-1') return null

      const page = pages[pageId]

      return {
        title: page.title,
        url: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
        snippet: page.extract || '',
        publisher: 'Wikipedia',
        sourceType: 'wikipedia'
      }
    } catch {
      return null
    }
  }

  async fetch(url: string): Promise<string> {
    // Extract title from Wikipedia URL
    const match = url.match(/\/wiki\/(.+)$/)
    if (!match) {
      throw new Error('Invalid Wikipedia URL')
    }

    const title = decodeURIComponent(match[1])
    const result = await this.getExtract(title)
    return result?.snippet || ''
  }
}
