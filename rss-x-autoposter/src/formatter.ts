import { config } from './config.js';
import { FeedItem } from './db.js';

const MAX_TWEET_LENGTH = 280;

// Reserve space for link (t.co wraps to 23 chars) + newline
const TCO_LENGTH = 23;

/**
 * Format a feed item into a tweet
 */
export function formatTweet(item: FeedItem): string {
  const prefix = `[${item.feed}]`;
  const hashtags = config.hashtags?.length ? ' ' + config.hashtags.join(' ') : '';

  // Calculate available space for title
  // Format: [PREFIX] Title\nlink hashtags
  // Account for: prefix + space + title + newline + link + hashtags
  const fixedParts = prefix.length + 1 + 1 + TCO_LENGTH + hashtags.length; // +1 space after prefix, +1 newline
  const maxTitleLength = MAX_TWEET_LENGTH - fixedParts;

  let title = item.title;

  // Trim title if needed
  if (title.length > maxTitleLength) {
    // Leave room for ellipsis
    title = title.slice(0, maxTitleLength - 1).trim() + '…';
  }

  // Build the tweet
  let tweet = `${prefix} ${title}\n${item.link}`;

  // Add hashtags if they fit
  if (hashtags && tweet.length + hashtags.length <= MAX_TWEET_LENGTH) {
    tweet += hashtags;
  }

  return tweet;
}

/**
 * Validate that a tweet is within X's limits
 */
export function validateTweet(tweet: string): { valid: boolean; error?: string } {
  if (!tweet || tweet.trim().length === 0) {
    return { valid: false, error: 'Tweet is empty' };
  }

  if (tweet.length > MAX_TWEET_LENGTH) {
    return { valid: false, error: `Tweet exceeds ${MAX_TWEET_LENGTH} characters (${tweet.length})` };
  }

  return { valid: true };
}

/**
 * Preview a tweet (for dry run logging)
 */
export function previewTweet(item: FeedItem): string {
  const tweet = formatTweet(item);
  return `
────────────────────────────────────────
TWEET PREVIEW (${tweet.length}/${MAX_TWEET_LENGTH} chars)
────────────────────────────────────────
${tweet}
────────────────────────────────────────
Feed: ${item.feed}
ID: ${item.id}
Published: ${item.pubDate || 'N/A'}
────────────────────────────────────────`;
}
