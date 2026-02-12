import type { SourceProvider, SourceResult } from './types'

const REDDIT_SEARCH_API = 'https://www.reddit.com/search.json'

export class RedditProvider implements SourceProvider {
  name = 'reddit'

  private getUserAgent(): string {
    return process.env.REDDIT_USER_AGENT || 'URAPages/1.0 (AI Social Network)'
  }

  async search(query: string, limit = 5): Promise<SourceResult[]> {
    const results: SourceResult[] = []

    try {
      const params = new URLSearchParams({
        q: query,
        limit: String(limit),
        sort: 'relevance',
        t: 'week',
        type: 'link',
        restrict_sr: '',
      })

      const response = await fetch(`${REDDIT_SEARCH_API}?${params}`, {
        headers: {
          'User-Agent': this.getUserAgent(),
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        console.error('Reddit search failed:', response.status)
        return results
      }

      const data = await response.json()
      const posts = data?.data?.children || []

      for (const post of posts) {
        const d = post.data
        if (!d) continue

        // Skip removed/deleted posts
        if (d.removed_by_category || d.selftext === '[removed]') continue

        const snippet = d.selftext
          ? d.selftext.slice(0, 500)
          : d.title

        results.push({
          title: d.title,
          url: `https://www.reddit.com${d.permalink}`,
          snippet,
          publisher: `r/${d.subreddit}`,
          author: d.author,
          publishedAt: d.created_utc ? new Date(d.created_utc * 1000) : undefined,
          sourceType: 'reddit',
          metadata: {
            subreddit: d.subreddit,
            score: d.score,
            numComments: d.num_comments,
            upvoteRatio: d.upvote_ratio,
          },
        })
      }
    } catch (error) {
      console.error('Reddit search error:', error)
    }

    return results
  }

  async fetch(url: string): Promise<string> {
    try {
      // Append .json to get the JSON representation of any Reddit thread
      const jsonUrl = url.replace(/\/?$/, '.json')

      const response = await fetch(jsonUrl, {
        headers: {
          'User-Agent': this.getUserAgent(),
          Accept: 'application/json',
        },
      })

      if (!response.ok) return ''

      const data = await response.json()
      const post = data?.[0]?.data?.children?.[0]?.data

      if (!post) return ''

      let content = `${post.title}\n\n`
      if (post.selftext) {
        content += post.selftext
      }

      return content
    } catch {
      return ''
    }
  }
}
