import { TwitterApi } from 'twitter-api-v2';
import { config } from './config.js';
import { logger } from './logger.js';

// Create Twitter client with OAuth 1.0a user context
const client = new TwitterApi({
  appKey: config.xApiKey,
  appSecret: config.xApiSecret,
  accessToken: config.xAccessToken,
  accessSecret: config.xAccessSecret,
});

// Read-write client
const rwClient = client.readWrite;

export interface PostResult {
  success: boolean;
  tweetId?: string;
  error?: string;
  rateLimited?: boolean;
  retryAfter?: number; // seconds
}

export interface ThreadResult {
  success: boolean;
  rootTweetId?: string;
  tweetIds?: string[];
  error?: string;
  rateLimited?: boolean;
  retryAfter?: number;
  partialTweetIds?: string[]; // Tweet IDs posted before failure
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Post a single tweet to X
 */
export async function postTweet(text: string, replyToId?: string): Promise<PostResult> {
  if (config.dryRun) {
    logger.info('DRY RUN: Would post tweet', {
      textLength: text.length,
      replyToId: replyToId || null,
    });
    return {
      success: true,
      tweetId: `dry-run-${Date.now()}`,
    };
  }

  try {
    const options: { text: string; reply?: { in_reply_to_tweet_id: string } } = { text };

    if (replyToId) {
      options.reply = { in_reply_to_tweet_id: replyToId };
    }

    const response = await rwClient.v2.tweet(options);

    logger.info('Tweet posted successfully', {
      tweetId: response.data.id,
      textLength: text.length,
      isReply: !!replyToId,
    });

    return {
      success: true,
      tweetId: response.data.id,
    };
  } catch (error: unknown) {
    // Handle Twitter API errors
    if (error && typeof error === 'object' && 'code' in error) {
      const apiError = error as { code: number; message?: string; rateLimit?: { reset: number } };

      // Rate limit error
      if (apiError.code === 429) {
        const retryAfter = apiError.rateLimit?.reset
          ? Math.ceil((apiError.rateLimit.reset * 1000 - Date.now()) / 1000)
          : 900;

        logger.warn('Rate limited by X API', { retryAfter });

        return {
          success: false,
          error: 'Rate limited',
          rateLimited: true,
          retryAfter,
        };
      }

      // Duplicate tweet error
      if (apiError.code === 403 && apiError.message?.includes('duplicate')) {
        logger.warn('Duplicate tweet detected by X', { textLength: text.length });
        return {
          success: false,
          error: 'Duplicate tweet',
        };
      }
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to post tweet', { error: errorMessage });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Post a thread (multiple tweets as replies)
 */
export async function postThread(texts: string[]): Promise<ThreadResult> {
  if (texts.length === 0) {
    return { success: false, error: 'Empty thread' };
  }

  // Single tweet - use simpler path
  if (texts.length === 1) {
    const result = await postTweet(texts[0]);
    if (result.success) {
      return {
        success: true,
        rootTweetId: result.tweetId,
        tweetIds: [result.tweetId!],
      };
    }
    return {
      success: false,
      error: result.error,
      rateLimited: result.rateLimited,
      retryAfter: result.retryAfter,
    };
  }

  // Multiple tweets - post as thread
  const tweetIds: string[] = [];
  let previousTweetId: string | undefined;

  if (config.dryRun) {
    logger.info('DRY RUN: Would post thread', { tweetCount: texts.length });
    for (let i = 0; i < texts.length; i++) {
      const fakeId = `dry-run-${Date.now()}-${i}`;
      tweetIds.push(fakeId);
      logger.info(`DRY RUN: Tweet ${i + 1}/${texts.length}`, {
        textLength: texts[i].length,
        replyTo: previousTweetId || 'none',
      });
      previousTweetId = fakeId;

      // Simulate delay between tweets
      if (i < texts.length - 1) {
        logger.debug(`DRY RUN: Would wait ${config.threadDelayBetweenTweetsSec}s`);
      }
    }

    return {
      success: true,
      rootTweetId: tweetIds[0],
      tweetIds,
    };
  }

  // Real posting
  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];

    logger.info(`Posting tweet ${i + 1}/${texts.length}`, {
      textLength: text.length,
      replyTo: previousTweetId || 'root',
    });

    const result = await postTweet(text, previousTweetId);

    if (!result.success) {
      logger.error('Thread posting failed mid-thread', {
        failedAt: i + 1,
        totalTweets: texts.length,
        error: result.error,
        postedTweetIds: tweetIds,
      });

      return {
        success: false,
        error: `Failed at tweet ${i + 1}/${texts.length}: ${result.error}`,
        rateLimited: result.rateLimited,
        retryAfter: result.retryAfter,
        partialTweetIds: tweetIds.length > 0 ? tweetIds : undefined,
        rootTweetId: tweetIds[0],
      };
    }

    tweetIds.push(result.tweetId!);
    previousTweetId = result.tweetId;

    // Delay between tweets (except after the last one)
    if (i < texts.length - 1) {
      logger.debug(`Waiting ${config.threadDelayBetweenTweetsSec}s before next tweet`);
      await delay(config.threadDelayBetweenTweetsSec * 1000);
    }
  }

  logger.info('Thread posted successfully', {
    rootTweetId: tweetIds[0],
    totalTweets: tweetIds.length,
  });

  return {
    success: true,
    rootTweetId: tweetIds[0],
    tweetIds,
  };
}

/**
 * Verify X API credentials by fetching the authenticated user
 */
export async function verifyCredentials(): Promise<{ valid: boolean; username?: string; error?: string }> {
  if (config.dryRun) {
    logger.info('DRY RUN: Skipping credential verification');
    return { valid: true, username: 'dry-run-user' };
  }

  try {
    const user = await rwClient.v2.me();
    logger.info('X API credentials verified', { username: user.data.username });
    return { valid: true, username: user.data.username };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to verify X API credentials', { error: errorMessage });
    return { valid: false, error: errorMessage };
  }
}
