import Parser from 'rss-parser';
import crypto from 'crypto';
import { config } from './config.js';
import { logger } from './logger.js';
import { FeedItem, isItemPosted, isItemInQueue, addToQueue } from './db.js';

const parser = new Parser({
  timeout: 30000,
  headers: {
    'User-Agent': 'RSS-X-Autoposter/1.0',
  },
});

export type FeedType = 'NEWSROOM' | 'LATEST';

interface RSSItem {
  guid?: string;
  link?: string;
  title?: string;
  pubDate?: string;
  isoDate?: string;
}

/**
 * Generate a unique ID for an RSS item
 * Priority: guid > normalized link > hash of title+pubDate
 */
function generateItemId(item: RSSItem, feedType: FeedType): string {
  // 1. Try GUID
  if (item.guid && item.guid.trim()) {
    return `guid:${item.guid.trim()}`;
  }

  // 2. Try normalized link
  if (item.link && item.link.trim()) {
    const normalizedLink = normalizeUrl(item.link);
    return `link:${normalizedLink}`;
  }

  // 3. Fall back to hash of title + pubDate
  const hashInput = `${item.title || ''}|${item.pubDate || item.isoDate || ''}`;
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex').slice(0, 16);
  return `hash:${feedType}:${hash}`;
}

/**
 * Normalize URL for comparison
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove trailing slashes, convert to lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();
    let normalized = parsed.toString();
    // Remove trailing slash if present (unless it's just the root)
    if (normalized.endsWith('/') && parsed.pathname !== '/') {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return url.trim().toLowerCase();
  }
}

/**
 * Ensure URL uses HTTPS if possible
 */
function ensureHttps(url: string): string {
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  return url;
}

/**
 * Parse a single feed and return normalized items
 */
async function parseFeed(feedUrl: string, feedType: FeedType): Promise<FeedItem[]> {
  logger.info(`Fetching feed: ${feedType}`, { url: feedUrl });

  try {
    const feed = await parser.parseURL(feedUrl);
    const items: FeedItem[] = [];

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

      const id = generateItemId(item, feedType);
      const feedItem: FeedItem = {
        id,
        feed: feedType,
        title: item.title.trim(),
        link: ensureHttps(item.link.trim()),
        pubDate: item.isoDate || item.pubDate || null,
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
    const normalizedLink = normalizeUrl(item.link);
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
    });
  }

  return results;
}
