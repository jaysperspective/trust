import type { SourceProvider, SourceResult } from './types'

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'

export class WikidataProvider implements SourceProvider {
  name = 'wikidata'

  async search(query: string, limit = 5): Promise<SourceResult[]> {
    const results: SourceResult[] = []

    try {
      const params = new URLSearchParams({
        action: 'wbsearchentities',
        search: query,
        language: 'en',
        limit: String(limit),
        format: 'json',
        origin: '*'
      })

      const response = await fetch(`${WIKIDATA_API}?${params}`)

      if (!response.ok) {
        console.error('Wikidata search failed:', response.status)
        return results
      }

      const data = await response.json()
      const entities = data.search || []

      for (const entity of entities) {
        // Get entity details
        const details = await this.getEntityDetails(entity.id)
        if (details) {
          results.push(details)
        }
      }
    } catch (error) {
      console.error('Wikidata search error:', error)
    }

    return results
  }

  private async getEntityDetails(entityId: string): Promise<SourceResult | null> {
    try {
      const params = new URLSearchParams({
        action: 'wbgetentities',
        ids: entityId,
        props: 'labels|descriptions|claims',
        languages: 'en',
        format: 'json',
        origin: '*'
      })

      const response = await fetch(`${WIKIDATA_API}?${params}`)
      if (!response.ok) return null

      const data = await response.json()
      const entity = data.entities?.[entityId]

      if (!entity) return null

      const label = entity.labels?.en?.value || entityId
      const description = entity.descriptions?.en?.value || ''

      // Extract some key claims for the snippet
      const claims: string[] = []

      // Instance of (P31)
      if (entity.claims?.P31) {
        const instanceOf = await this.getClaimLabel(entity.claims.P31[0])
        if (instanceOf) claims.push(`Instance of: ${instanceOf}`)
      }

      // Country (P17)
      if (entity.claims?.P17) {
        const country = await this.getClaimLabel(entity.claims.P17[0])
        if (country) claims.push(`Country: ${country}`)
      }

      // Inception date (P571)
      if (entity.claims?.P571) {
        const inception = entity.claims.P571[0]?.mainsnak?.datavalue?.value?.time
        if (inception) {
          const year = inception.match(/\+?(\d{4})/)?.[1]
          if (year) claims.push(`Founded: ${year}`)
        }
      }

      const snippet = [description, ...claims].filter(Boolean).join('. ')

      return {
        title: label,
        url: `https://www.wikidata.org/wiki/${entityId}`,
        snippet: snippet || `Wikidata entity: ${label}`,
        publisher: 'Wikidata',
        sourceType: 'wikidata',
        metadata: { entityId }
      }
    } catch {
      return null
    }
  }

  private async getClaimLabel(claim: {
    mainsnak?: {
      datavalue?: {
        value?: { id?: string }
      }
    }
  }): Promise<string | null> {
    const entityId = claim?.mainsnak?.datavalue?.value?.id
    if (!entityId) return null

    try {
      const params = new URLSearchParams({
        action: 'wbgetentities',
        ids: entityId,
        props: 'labels',
        languages: 'en',
        format: 'json',
        origin: '*'
      })

      const response = await fetch(`${WIKIDATA_API}?${params}`)
      if (!response.ok) return null

      const data = await response.json()
      return data.entities?.[entityId]?.labels?.en?.value || null
    } catch {
      return null
    }
  }
}
