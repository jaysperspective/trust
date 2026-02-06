import Parser from 'rss-parser';
import crypto from 'crypto';
import { config } from './config.js';
import { logger } from './logger.js';
import { FeedItemExtended, isItemPosted, isItemInQueue, addToQueue } from './db.js';

// Custom RSS parser with content:encoded support
const parser = new Parser<Record<string, unknown>, { 'content:encoded'?: string }>({
  timeout: 30000,
  headers: {
    'User-Agent': 'RSS-X-Autoposter/1.0',
  },
  customFields: {
    item: ['content:encoded'],
  },
});

export type FeedType = 'NEWSROOM' | 'LATEST';

interface RSSItem {
  guid?: string;
  link?: string;
  title?: string;
  pubDate?: string;
  isoDate?: string;
  content?: string;
  contentSnippet?: string;
  'content:encoded'?: string;
  description?: string;
}

/**
 * Replace localhost URLs with the public base URL
 */
function replaceLocalhostUrl(url: string): string {
  if (!url) return url;

  // Patterns to replace
  const localhostPatterns = [
    /https?:\/\/localhost:3000/gi,
    /https?:\/\/localhost/gi,
    /https?:\/\/127\.0\.0\.1:3000/gi,
    /https?:\/\/127\.0\.0\.1/gi,
  ];

  let result = url;
  for (const pattern of localhostPatterns) {
    result = result.replace(pattern, config.basePublicUrl.replace(/\/$/, ''));
  }

  return result;
}

/**
 * Normalize URL: replace localhost, ensure HTTPS if base is HTTPS
 */
function normalizePublicUrl(url: string): string {
  let normalized = replaceLocalhostUrl(url);

  // If our base URL is HTTPS, upgrade HTTP to HTTPS
  if (config.basePublicUrl.startsWith('https://') && normalized.startsWith('http://')) {
    // Only upgrade if it's our domain
    try {
      const baseHost = new URL(config.basePublicUrl).hostname;
      const urlHost = new URL(normalized).hostname;
      if (urlHost === baseHost) {
        normalized = normalized.replace('http://', 'https://');
      }
    } catch {
      // If URL parsing fails, leave as-is
    }
  }

  return normalized;
}

/**
 * Generate a unique ID for an RSS item
 * Priority: guid > normalized link > hash of title+pubDate
 */
function generateItemId(item: RSSItem, feedType: FeedType): string {
  // 1. Try GUID (after normalizing localhost)
  if (item.guid && item.guid.trim()) {
    const normalizedGuid = replaceLocalhostUrl(item.guid.trim());
    return `guid:${normalizedGuid}`;
  }

  // 2. Try normalized link
  if (item.link && item.link.trim()) {
    const normalizedLink = normalizeUrlForComparison(normalizePublicUrl(item.link));
    return `link:${normalizedLink}`;
  }

  // 3. Fall back to hash of title + pubDate
  const hashInput = `${item.title || ''}|${item.pubDate || item.isoDate || ''}`;
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex').slice(0, 16);
  return `hash:${feedType}:${hash}`;
}

/**
 * Normalize URL for comparison (lowercase hostname, remove trailing slash)
 */
function normalizeUrlForComparison(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.toLowerCase();
    let normalized = parsed.toString();
    if (normalized.endsWith('/') && parsed.pathname !== '/') {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return url.trim().toLowerCase();
  }
}

/**
 * Extract content from RSS item for thread generation
 */
function extractContent(item: RSSItem): string | null {
  // Prefer content:encoded (full HTML content)
  if (item['content:encoded'] && item['content:encoded'].trim()) {
    return item['content:encoded'];
  }

  // Then try content
  if (item.content && item.content.trim()) {
    return item.content;
  }

  // Then description
  if (item.description && item.description.trim()) {
    return item.description;
  }

  // Then contentSnippet (plain text)
  if (item.contentSnippet && item.contentSnippet.trim()) {
    return item.contentSnippet;
  }

  return null;
}

/**
 * Parse a single feed and return normalized items
 */
async function parseFeed(feedUrl: string, feedType: FeedType): Promise<FeedItemExtended[]> {
  logger.info(`Fetching feed: ${feedType}`, { url: feedUrl });

  try {
    const feed = await parser.parseURL(feedUrl);
    const items: FeedItemExtended[] = [];

    for (const item of feed.items || []) {
      // Skip items without title or link
      if (!item.title?.trim()) {
        logger.warn('Skipping item without title', { feedType, link: item.link });
        continue;
      }
      if (!item.link?.trim()) {
        logger.warn('Skipping item without link', { feedType, title: item.title });
        continue;
      }

      // Normalize URLs (replace localhost, ensure HTTPS)
      const normalizedLink = normalizePublicUrl(item.link.trim());

      const id = generateItemId(item as RSSItem, feedType);
      const content = extractContent(item as RSSItem);

      const feedItem: FeedItemExtended = {
        id,
        feed: feedType,
        title: item.title.trim(),
        link: normalizedLink,
        pubDate: item.isoDate || item.pubDate || null,
        content: content,
      };

      items.push(feedItem);
    }

    logger.info(`Parsed ${items.length} items from ${feedType} feed`);
    return items;
  } catch (error) {
    logger.error(`Failed to fetch/parse ${feedType} feed`, {
      error: error instanceof Error ? error.message : String(error),
      url: feedUrl,
    });
    return [];
  }
}

/**
 * Fetch both feeds and queue new items
 */
export async function pollFeeds(): Promise<{ newsroomNew: number; latestNew: number }> {
  const results = { newsroomNew: 0, latestNew: 0 };

  // Track all item IDs we've seen to handle cross-feed deduplication
  const seenIds = new Set<string>();
  const newsroomItemIds = new Set<string>();

  // Parse both feeds
  const [newsroomItems, latestItems] = await Promise.all([
    parseFeed(config.feedNewsroomUrl, 'NEWSROOM'),
    parseFeed(config.feedLatestUrl, 'LATEST'),
  ]);

  // Process NEWSROOM items first (higher priority for tie-breaking)
  let newsroomQueued = 0;
  for (const item of newsroomItems) {
    if (newsroomQueued >= config.maxNewItemsPerFeedPerPoll) {
      logger.info(`Hit max items limit for NEWSROOM (${config.maxNewItemsPerFeedPerPoll})`);
      break;
    }

    // Check if already posted or in queue
    if (isItemPosted(item.id)) {
      logger.debug('Item already posted', { id: item.id, feed: 'NEWSROOM' });
      continue;
    }
    if (isItemInQueue(item.id)) {
      logger.debug('Item already in queue', { id: item.id, feed: 'NEWSROOM' });
      continue;
    }

    // Add to queue
    addToQueue(item);
    seenIds.add(item.id);
    newsroomItemIds.add(item.id);
    newsroomQueued++;
    results.newsroomNew++;

    logger.info('Queued new item from NEWSROOM', {
      id: item.id,
      title: item.title.slice(0, 50),
      link: item.link,
    });
  }

  // Process LATEST items (skip if same story in NEWSROOM)
  let latestQueued = 0;
  for (const item of latestItems) {
    if (latestQueued >= config.maxNewItemsPerFeedPerPoll) {
      logger.info(`Hit max items limit for LATEST (${config.maxNewItemsPerFeedPerPoll})`);
      break;
    }

    // Cross-feed deduplication: skip if same item in NEWSROOM
    // Check by link (normalized) since ID might differ between feeds
    const normalizedLink = normalizeUrlForComparison(item.link);
    const linkId = `link:${normalizedLink}`;

    if (newsroomItemIds.has(linkId) || seenIds.has(item.id)) {
      logger.debug('Skipping LATEST item (duplicate of NEWSROOM)', {
        id: item.id,
        title: item.title.slice(0, 50),
      });
      continue;
    }

    // Check if already posted or in queue
    if (isItemPosted(item.id)) {
      // Also check by link ID
      if (isItemPosted(linkId)) {
        logger.debug('Item already posted', { id: item.id, feed: 'LATEST' });
        continue;
      }
    }
    if (isItemInQueue(item.id)) {
      logger.debug('Item already in queue', { id: item.id, feed: 'LATEST' });
      continue;
    }

    // Add to queue
    addToQueue(item);
    seenIds.add(item.id);
    latestQueued++;
    results.latestNew++;

    logger.info('Queued new item from LATEST', {
      id: item.id,
      title: item.title.slice(0, 50),
      link: item.link,
    });
  }

  return results;
}
