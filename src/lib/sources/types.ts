export interface SourceResult {
  title: string
  url?: string
  snippet: string
  publisher?: string
  author?: string
  publishedAt?: Date
  sourceType: 'wikipedia' | 'wikidata' | 'news' | 'rss' | 'url' | 'reddit'
  metadata?: Record<string, unknown>
}

export interface SourceProvider {
  name: string
  search(query: string, limit?: number): Promise<SourceResult[]>
  fetch?(url: string): Promise<string>
}
