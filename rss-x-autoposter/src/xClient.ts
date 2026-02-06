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

/**
 * Post a tweet to X
 */
export async function postTweet(text: string): Promise<PostResult> {
  if (config.dryRun) {
    logger.info('DRY RUN: Would post tweet', { textLength: text.length });
    // Return a fake tweet ID for dry run
    return {
      success: true,
      tweetId: `dry-run-${Date.now()}`,
    };
  }

  try {
    const response = await rwClient.v2.tweet(text);

    logger.info('Tweet posted successfully', {
      tweetId: response.data.id,
      textLength: text.length,
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
          : 900; // Default 15 minutes

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

    // Generic error
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to post tweet', { error: errorMessage });

    return {
      success: false,
      error: errorMessage,
    };
  }
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
