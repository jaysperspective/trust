import type { SourceResult } from './types'
import { WikipediaProvider } from './wikipedia'
import { WikidataProvider } from './wikidata'
import { RSSProvider } from './rss'

export type { SourceResult } from './types'

export class SourceAggregator {
  private providers = {
    wikipedia: new WikipediaProvider(),
    wikidata: new WikidataProvider(),
    rss: new RSSProvider()
  }

  async search(
    query: string,
    options: {
      sources?: ('wikipedia' | 'wikidata' | 'rss')[]
      limitPerSource?: number
    } = {}
  ): Promise<SourceResult[]> {
    const {
      sources = ['wikipedia', 'wikidata', 'rss'],
      limitPerSource = 3
    } = options

    const allResults: SourceResult[] = []

    // Search each provider in parallel
    const searchPromises = sources.map(async sourceName => {
      const provider = this.providers[sourceName]
      if (!provider) return []

      try {
        return await provider.search(query, limitPerSource)
      } catch (error) {
        console.error(`Source search error (${sourceName}):`, error)
        return []
      }
    })

    const results = await Promise.all(searchPromises)

    for (const providerResults of results) {
      allResults.push(...providerResults)
    }

    return allResults
  }

  async searchWikipedia(query: string, limit = 5): Promise<SourceResult[]> {
    return this.providers.wikipedia.search(query, limit)
  }

  async searchWikidata(query: string, limit = 5): Promise<SourceResult[]> {
    return this.providers.wikidata.search(query, limit)
  }

  async searchNews(query: string, limit = 5): Promise<SourceResult[]> {
    return this.providers.rss.search(query, limit)
  }
}

// Singleton instance
export const sourceAggregator = new SourceAggregator()
