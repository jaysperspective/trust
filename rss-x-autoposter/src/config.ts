import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';
import { logger } from './logger.js';

// Load .env file
dotenvConfig();

const threadModeSchema = z.enum(['off', 'summary', 'full']).default('off');
const threadFirstTweetPrefixModeSchema = z.enum(['tag', 'none']).default('tag');

const configSchema = z.object({
  // X API credentials
  xApiKey: z.string().min(1, 'X_API_KEY is required'),
  xApiSecret: z.string().min(1, 'X_API_SECRET is required'),
  xAccessToken: z.string().min(1, 'X_ACCESS_TOKEN is required'),
  xAccessSecret: z.string().min(1, 'X_ACCESS_SECRET is required'),

  // Feed URLs
  feedNewsroomUrl: z.string().url('FEED_NEWSROOM_URL must be a valid URL'),
  feedLatestUrl: z.string().url('FEED_LATEST_URL must be a valid URL'),

  // Base public URL for localhost replacement
  basePublicUrl: z.string().url().default('https://urapages.com'),

  // Polling & Rate limits
  pollIntervalSec: z.coerce.number().int().min(60).default(300),
  maxNewItemsPerFeedPerPoll: z.coerce.number().int().min(1).max(10).default(3),
  minDelayBetweenPostsSec: z.coerce.number().int().min(30).default(90),
  maxRetries: z.coerce.number().int().min(1).max(10).default(5),

  // Global throttle: minimum time between stories (one story = one queue item/thread)
  minTimeBetweenStoriesSec: z.coerce.number().int().min(0).default(3600),

  // Thread mode settings
  threadMode: threadModeSchema,
  threadMaxTweets: z.coerce.number().int().min(1).max(25).default(8),
  threadAppendLinkLast: z.preprocess(
    (val) => val === 'true' || val === true || val === undefined,
    z.boolean().default(true)
  ),
  threadFirstTweetPrefixMode: threadFirstTweetPrefixModeSchema,
  threadDelayBetweenTweetsSec: z.coerce.number().int().min(1).default(10),

  // Operation mode
  dryRun: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean().default(false)
  ),

  // HTTP Server
  port: z.coerce.number().int().min(1).max(65535).default(3100),

  // Optional: Hashtags
  hashtags: z.string().optional().transform((val) => {
    if (!val || val.trim() === '') return [];
    return val.split(',').map((tag) => tag.trim()).filter(Boolean);
  }),

  // Timezone
  timezone: z.string().default('UTC'),
});

export type Config = z.infer<typeof configSchema>;
export type ThreadMode = z.infer<typeof threadModeSchema>;

function loadConfig(): Config {
  const rawConfig = {
    xApiKey: process.env.X_API_KEY,
    xApiSecret: process.env.X_API_SECRET,
    xAccessToken: process.env.X_ACCESS_TOKEN,
    xAccessSecret: process.env.X_ACCESS_SECRET,
    feedNewsroomUrl: process.env.FEED_NEWSROOM_URL,
    feedLatestUrl: process.env.FEED_LATEST_URL,
    basePublicUrl: process.env.BASE_PUBLIC_URL,
    pollIntervalSec: process.env.POLL_INTERVAL_SEC,
    maxNewItemsPerFeedPerPoll: process.env.MAX_NEW_ITEMS_PER_FEED_PER_POLL,
    minDelayBetweenPostsSec: process.env.MIN_DELAY_BETWEEN_POSTS_SEC,
    maxRetries: process.env.MAX_RETRIES,
    minTimeBetweenStoriesSec: process.env.MIN_TIME_BETWEEN_STORIES_SEC,
    threadMode: process.env.THREAD_MODE,
    threadMaxTweets: process.env.THREAD_MAX_TWEETS,
    threadAppendLinkLast: process.env.THREAD_APPEND_LINK_LAST,
    threadFirstTweetPrefixMode: process.env.THREAD_FIRST_TWEET_PREFIX_MODE,
    threadDelayBetweenTweetsSec: process.env.THREAD_DELAY_BETWEEN_TWEETS_SEC,
    dryRun: process.env.DRY_RUN,
    port: process.env.PORT,
    hashtags: process.env.HASHTAGS,
    timezone: process.env.TIMEZONE,
  };

  const result = configSchema.safeParse(rawConfig);

  if (!result.success) {
    logger.error('Configuration validation failed:');
    result.error.errors.forEach((err) => {
      logger.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();

// Log config at startup (masking secrets)
export function logConfig(): void {
  logger.info('Configuration loaded:', {
    feedNewsroomUrl: config.feedNewsroomUrl,
    feedLatestUrl: config.feedLatestUrl,
    basePublicUrl: config.basePublicUrl,
    pollIntervalSec: config.pollIntervalSec,
    maxNewItemsPerFeedPerPoll: config.maxNewItemsPerFeedPerPoll,
    minDelayBetweenPostsSec: config.minDelayBetweenPostsSec,
    minTimeBetweenStoriesSec: config.minTimeBetweenStoriesSec,
    maxRetries: config.maxRetries,
    threadMode: config.threadMode,
    threadMaxTweets: config.threadMaxTweets,
    threadAppendLinkLast: config.threadAppendLinkLast,
    threadFirstTweetPrefixMode: config.threadFirstTweetPrefixMode,
    threadDelayBetweenTweetsSec: config.threadDelayBetweenTweetsSec,
    dryRun: config.dryRun,
    port: config.port,
    hashtags: config.hashtags,
    timezone: config.timezone,
    xApiKey: config.xApiKey.slice(0, 4) + '***',
  });
}
