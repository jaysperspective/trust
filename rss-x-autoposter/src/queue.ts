import { config } from './config.js';
import { logger } from './logger.js';
import {
  FeedItemExtended,
  QueueItem,
  getNextQueuedItem,
  peekNextQueuedItem,
  updateQueueItem,
  markItemPosted,
  getQueueStats,
  getLastStoryPostedAt,
} from './db.js';
import { buildTweets, validateThread, previewThread } from './threadFormatter.js';
import { postThread } from './xClient.js';

// Track last post time for rate limiting within session
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
  const baseDelay = 60;
  const maxDelay = 1800;
  const delay = Math.min(baseDelay * Math.pow(2, attempts), maxDelay);
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}

/**
 * Check global story throttle
 * Returns null if posting is allowed, or the number of seconds to wait
 */
function checkGlobalThrottle(): number | null {
  if (config.minTimeBetweenStoriesSec <= 0) {
    return null; // Throttle disabled
  }

  const lastStoryPosted = getLastStoryPostedAt();

  if (!lastStoryPosted) {
    return null; // No previous posts, allow immediately
  }

  const timeSinceLastStory = (Date.now() - lastStoryPosted.getTime()) / 1000;
  const waitTime = config.minTimeBetweenStoriesSec - timeSinceLastStory;

  if (waitTime <= 0) {
    return null; // Throttle period passed
  }

  return Math.ceil(waitTime);
}

/**
 * Process the next item in the queue
 * Returns true if an item was processed, false if queue is empty or waiting
 */
export async function processNextQueueItem(): Promise<boolean> {
  // Check global story throttle first
  const throttleWait = checkGlobalThrottle();
  if (throttleWait !== null) {
    // Peek at next item to schedule it for later
    const nextItem = peekNextQueuedItem();
    if (nextItem) {
      const nextAttemptAt = new Date(Date.now() + throttleWait * 1000);

      // Only update if the item isn't already scheduled further out
      const currentNextAttempt = nextItem.nextAttemptAt ? new Date(nextItem.nextAttemptAt) : null;
      if (!currentNextAttempt || currentNextAttempt < nextAttemptAt) {
        updateQueueItem(nextItem.id, {
          nextAttemptAt: nextAttemptAt.toISOString(),
        });

        logger.info('Hourly throttle active, delaying item', {
          id: nextItem.id,
          waitSeconds: throttleWait,
          nextAttemptAt: nextAttemptAt.toISOString(),
          lastPosted: getLastStoryPostedAt()?.toISOString(),
        });
      }
    }
    return false;
  }

  // Check session rate limit (minimum delay between posts)
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
  let feedItem: FeedItemExtended;
  try {
    feedItem = JSON.parse(queueItem.payloadJson) as FeedItemExtended;
  } catch (error) {
    logger.error('Failed to parse queue item payload', { id: queueItem.id });
    updateQueueItem(queueItem.id, {
      status: 'failed',
      errorMessage: 'Invalid payload JSON',
    });
    return true;
  }

  // Build tweets based on thread mode
  const tweets = buildTweets(feedItem);
  const validation = validateThread(tweets);

  if (!validation.valid) {
    logger.error('Invalid tweet/thread format', { id: queueItem.id, error: validation.error });
    updateQueueItem(queueItem.id, {
      status: 'failed',
      errorMessage: validation.error || 'Invalid tweet',
    });
    return true;
  }

  // Log preview in dry run mode
  if (config.dryRun) {
    logger.info(previewThread(feedItem, tweets));
  }

  // Mark as posting
  updateQueueItem(queueItem.id, { status: 'posting' });

  // Post the thread (or single tweet)
  const result = await postThread(tweets);

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
      tweetId: result.rootTweetId || null,
    });

    logger.info('Successfully posted', {
      id: queueItem.id,
      rootTweetId: result.rootTweetId,
      tweetCount: result.tweetIds?.length || 1,
      title: feedItem.title.slice(0, 50),
      threadMode: config.threadMode,
    });

    return true;
  }

  // Handle failure
  lastPostError = result.error || 'Unknown error';
  const newAttempts = queueItem.attempts + 1;

  // If we got partial tweets, log them for debugging
  if (result.partialTweetIds && result.partialTweetIds.length > 0) {
    logger.warn('Thread partially posted before failure', {
      id: queueItem.id,
      partialTweetIds: result.partialTweetIds,
      rootTweetId: result.rootTweetId,
    });
    // Mark as failed to avoid duplicate partial threads
    // User can manually delete partial thread and reset if needed
    updateQueueItem(queueItem.id, {
      status: 'failed',
      attempts: newAttempts,
      errorMessage: `Partial thread failure: ${result.error}. Posted ${result.partialTweetIds.length}/${tweets.length} tweets. Root: ${result.rootTweetId}`,
    });
    return true;
  }

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

  logger.warn('Post failed, scheduling retry', {
    id: queueItem.id,
    attempts: newAttempts,
    nextAttempt: nextAttempt.toISOString(),
    backoffSeconds,
    error: result.error,
  });

  updateQueueItem(queueItem.id, {
    status: 'queued',
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
