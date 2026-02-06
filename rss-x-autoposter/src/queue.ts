import { config } from './config.js';
import { logger } from './logger.js';
import {
  FeedItem,
  QueueItem,
  getNextQueuedItem,
  updateQueueItem,
  markItemPosted,
  getQueueStats,
} from './db.js';
import { formatTweet, validateTweet, previewTweet } from './formatter.js';
import { postTweet } from './xClient.js';

// Track last post time for rate limiting
let lastPostTime: Date | null = null;
let lastPostError: string | null = null;

export function getLastPostTime(): Date | null {
  return lastPostTime;
}

export function getLastPostError(): string | null {
  return lastPostError;
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(attempts: number): number {
  // Base delay: 60 seconds, doubles each attempt, max 30 minutes
  const baseDelay = 60;
  const maxDelay = 1800;
  const delay = Math.min(baseDelay * Math.pow(2, attempts), maxDelay);
  // Add some jitter (±10%)
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}

/**
 * Process the next item in the queue
 * Returns true if an item was processed, false if queue is empty or waiting
 */
export async function processNextQueueItem(): Promise<boolean> {
  // Check rate limit (minimum delay between posts)
  if (lastPostTime) {
    const timeSinceLastPost = (Date.now() - lastPostTime.getTime()) / 1000;
    if (timeSinceLastPost < config.minDelayBetweenPostsSec) {
      const waitTime = Math.ceil(config.minDelayBetweenPostsSec - timeSinceLastPost);
      logger.debug(`Rate limit: waiting ${waitTime}s before next post`);
      return false;
    }
  }

  // Get next queued item
  const queueItem = getNextQueuedItem();
  if (!queueItem) {
    return false;
  }

  logger.info('Processing queue item', { id: queueItem.id, attempts: queueItem.attempts });

  // Parse the payload
  let feedItem: FeedItem;
  try {
    feedItem = JSON.parse(queueItem.payloadJson) as FeedItem;
  } catch (error) {
    logger.error('Failed to parse queue item payload', { id: queueItem.id });
    updateQueueItem(queueItem.id, {
      status: 'failed',
      errorMessage: 'Invalid payload JSON',
    });
    return true;
  }

  // Format the tweet
  const tweetText = formatTweet(feedItem);
  const validation = validateTweet(tweetText);

  if (!validation.valid) {
    logger.error('Invalid tweet format', { id: queueItem.id, error: validation.error });
    updateQueueItem(queueItem.id, {
      status: 'failed',
      errorMessage: validation.error || 'Invalid tweet',
    });
    return true;
  }

  // Log preview in dry run mode
  if (config.dryRun) {
    logger.info(previewTweet(feedItem));
  }

  // Mark as posting
  updateQueueItem(queueItem.id, { status: 'posting' });

  // Post the tweet
  const result = await postTweet(tweetText);

  if (result.success) {
    // Success! Mark as posted
    lastPostTime = new Date();
    lastPostError = null;

    updateQueueItem(queueItem.id, { status: 'posted' });

    markItemPosted({
      id: feedItem.id,
      feed: feedItem.feed,
      title: feedItem.title,
      link: feedItem.link,
      pubDate: feedItem.pubDate,
      tweetedAt: lastPostTime.toISOString(),
      tweetId: result.tweetId || null,
    });

    logger.info('Successfully posted tweet', {
      id: queueItem.id,
      tweetId: result.tweetId,
      title: feedItem.title.slice(0, 50),
    });

    return true;
  }

  // Handle failure
  lastPostError = result.error || 'Unknown error';
  const newAttempts = queueItem.attempts + 1;

  // Check if max retries exceeded
  if (newAttempts >= config.maxRetries) {
    logger.error('Max retries exceeded for queue item', {
      id: queueItem.id,
      attempts: newAttempts,
      error: result.error,
    });

    updateQueueItem(queueItem.id, {
      status: 'failed',
      attempts: newAttempts,
      errorMessage: result.error || 'Max retries exceeded',
    });

    return true;
  }

  // Schedule retry with backoff
  let backoffSeconds = calculateBackoff(newAttempts);

  // If rate limited, use the retry-after value
  if (result.rateLimited && result.retryAfter) {
    backoffSeconds = Math.max(backoffSeconds, result.retryAfter);
  }

  const nextAttempt = new Date(Date.now() + backoffSeconds * 1000);

  logger.warn('Tweet failed, scheduling retry', {
    id: queueItem.id,
    attempts: newAttempts,
    nextAttempt: nextAttempt.toISOString(),
    backoffSeconds,
    error: result.error,
  });

  updateQueueItem(queueItem.id, {
    status: 'queued', // Back to queued for retry
    attempts: newAttempts,
    nextAttemptAt: nextAttempt.toISOString(),
    errorMessage: result.error || null,
  });

  return true;
}

/**
 * Process all ready items in the queue (respecting rate limits)
 */
export async function processQueue(): Promise<number> {
  let processed = 0;

  // Process up to a reasonable limit to prevent infinite loops
  const maxIterations = 10;

  for (let i = 0; i < maxIterations; i++) {
    const wasProcessed = await processNextQueueItem();
    if (!wasProcessed) {
      break;
    }
    processed++;

    // Small delay between processing attempts
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (processed > 0) {
    const stats = getQueueStats();
    logger.info('Queue processing complete', { processed, ...stats });
  }

  return processed;
}
