import { config, ThreadMode } from './config.js';
import { FeedItemExtended } from './db.js';
import { logger } from './logger.js';

const MAX_TWEET_LENGTH = 280;
const THREAD_TWEET_LENGTH = 260; // Slightly shorter for threads
const TCO_LENGTH = 23; // t.co link length

/**
 * Strip HTML tags from content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract sentences from text
 */
function extractSentences(text: string): string[] {
  // Split on sentence boundaries
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  return sentences;
}

/**
 * Simple heuristic summarization: extract key points
 * Returns bullet points for the summary
 */
function heuristicSummarize(text: string, maxPoints: number = 5): string[] {
  const cleanText = stripHtml(text);
  const sentences = extractSentences(cleanText);

  if (sentences.length === 0) {
    return [];
  }

  // Take first N sentences as key points, filtering out very short ones
  const points: string[] = [];
  for (const sentence of sentences) {
    if (points.length >= maxPoints) break;

    const trimmed = sentence.trim();
    // Skip very short sentences or ones that look like metadata
    if (trimmed.length < 20) continue;
    if (trimmed.match(/^(by|photo|image|source|credit|read more)/i)) continue;

    points.push(trimmed);
  }

  return points;
}

/**
 * Split text into chunks for full thread mode
 */
function splitIntoChunks(text: string, maxLength: number): string[] {
  const cleanText = stripHtml(text);
  const paragraphs = cleanText.split(/\n\n+/).filter((p) => p.trim().length > 0);

  const chunks: string[] = [];

  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxLength) {
      chunks.push(paragraph.trim());
    } else {
      // Split long paragraphs by sentences
      const sentences = extractSentences(paragraph);
      let currentChunk = '';

      for (const sentence of sentences) {
        if ((currentChunk + ' ' + sentence).trim().length <= maxLength) {
          currentChunk = (currentChunk + ' ' + sentence).trim();
        } else {
          if (currentChunk) {
            chunks.push(currentChunk);
          }

          // If single sentence is too long, split by words
          if (sentence.length > maxLength) {
            const words = sentence.split(/\s+/);
            currentChunk = '';
            for (const word of words) {
              if ((currentChunk + ' ' + word).trim().length <= maxLength - 3) {
                currentChunk = (currentChunk + ' ' + word).trim();
              } else {
                if (currentChunk) {
                  chunks.push(currentChunk + '...');
                }
                currentChunk = word;
              }
            }
          } else {
            currentChunk = sentence;
          }
        }
      }

      if (currentChunk) {
        chunks.push(currentChunk);
      }
    }
  }

  return chunks;
}

/**
 * Format a single tweet (original behavior)
 */
export function formatSingleTweet(item: FeedItemExtended): string {
  const prefix = `[${item.feed}]`;
  const hashtags = config.hashtags?.length ? ' ' + config.hashtags.join(' ') : '';

  const fixedParts = prefix.length + 1 + 1 + TCO_LENGTH + hashtags.length;
  const maxTitleLength = MAX_TWEET_LENGTH - fixedParts;

  let title = item.title;
  if (title.length > maxTitleLength) {
    title = title.slice(0, maxTitleLength - 1).trim() + '...';
  }

  let tweet = `${prefix} ${title}\n${item.link}`;

  if (hashtags && tweet.length + hashtags.length <= MAX_TWEET_LENGTH) {
    tweet += hashtags;
  }

  return tweet;
}

/**
 * Build a thread for summary mode
 */
function buildSummaryThread(item: FeedItemExtended): string[] {
  const tweets: string[] = [];

  // Tweet 1: [SOURCE] Title + hook
  const prefix = config.threadFirstTweetPrefixMode === 'tag' ? `[${item.feed}] ` : '';
  let firstTweet = `${prefix}${item.title}`;

  // Add a hook (first sentence of content if available)
  if (item.content) {
    const cleanContent = stripHtml(item.content);
    const sentences = extractSentences(cleanContent);
    if (sentences.length > 0 && firstTweet.length + 2 + sentences[0].length <= THREAD_TWEET_LENGTH) {
      firstTweet += '\n\n' + sentences[0];
    }
  }

  // Truncate if needed
  if (firstTweet.length > THREAD_TWEET_LENGTH) {
    firstTweet = firstTweet.slice(0, THREAD_TWEET_LENGTH - 3).trim() + '...';
  }
  tweets.push(firstTweet);

  // Tweets 2..N: bullet points
  if (item.content) {
    const points = heuristicSummarize(item.content, 5);

    for (const point of points) {
      // Skip if we've hit max tweets (minus 1 for the link tweet)
      if (tweets.length >= config.threadMaxTweets - (config.threadAppendLinkLast ? 1 : 0)) {
        break;
      }

      let bulletTweet = `• ${point}`;
      if (bulletTweet.length > THREAD_TWEET_LENGTH) {
        bulletTweet = bulletTweet.slice(0, THREAD_TWEET_LENGTH - 3).trim() + '...';
      }
      tweets.push(bulletTweet);
    }
  }

  // Last tweet: link
  if (config.threadAppendLinkLast) {
    const linkTweet = `Read: ${item.link}`;
    tweets.push(linkTweet);
  }

  return tweets;
}

/**
 * Build a thread for full mode
 */
function buildFullThread(item: FeedItemExtended): string[] {
  const tweets: string[] = [];

  // Tweet 1: [SOURCE] Title
  const prefix = config.threadFirstTweetPrefixMode === 'tag' ? `[${item.feed}] ` : '';
  let firstTweet = `${prefix}${item.title}`;

  if (firstTweet.length > THREAD_TWEET_LENGTH) {
    firstTweet = firstTweet.slice(0, THREAD_TWEET_LENGTH - 3).trim() + '...';
  }
  tweets.push(firstTweet);

  // Tweets 2..N: content chunks
  if (item.content) {
    const chunks = splitIntoChunks(item.content, THREAD_TWEET_LENGTH);

    for (const chunk of chunks) {
      // Skip if we've hit max tweets (minus 1 for the link tweet)
      if (tweets.length >= config.threadMaxTweets - (config.threadAppendLinkLast ? 1 : 0)) {
        break;
      }
      tweets.push(chunk);
    }
  }

  // Last tweet: link
  if (config.threadAppendLinkLast) {
    const linkTweet = `Read: ${item.link}`;
    tweets.push(linkTweet);
  }

  return tweets;
}

/**
 * Build tweets for an item based on thread mode
 * Returns an array of tweet texts (single-element for off mode)
 */
export function buildTweets(item: FeedItemExtended): string[] {
  const mode: ThreadMode = config.threadMode;

  if (mode === 'off') {
    return [formatSingleTweet(item)];
  }

  if (mode === 'summary') {
    const thread = buildSummaryThread(item);
    logger.debug('Built summary thread', { id: item.id, tweetCount: thread.length });
    return thread;
  }

  if (mode === 'full') {
    const thread = buildFullThread(item);
    logger.debug('Built full thread', { id: item.id, tweetCount: thread.length });
    return thread;
  }

  // Default to single tweet
  return [formatSingleTweet(item)];
}

/**
 * Validate that all tweets in a thread are within limits
 */
export function validateThread(tweets: string[]): { valid: boolean; error?: string } {
  if (tweets.length === 0) {
    return { valid: false, error: 'Thread is empty' };
  }

  for (let i = 0; i < tweets.length; i++) {
    const tweet = tweets[i];
    if (!tweet || tweet.trim().length === 0) {
      return { valid: false, error: `Tweet ${i + 1} is empty` };
    }
    if (tweet.length > MAX_TWEET_LENGTH) {
      return { valid: false, error: `Tweet ${i + 1} exceeds ${MAX_TWEET_LENGTH} characters (${tweet.length})` };
    }
  }

  return { valid: true };
}

/**
 * Preview thread (for dry run logging)
 */
export function previewThread(item: FeedItemExtended, tweets: string[]): string {
  const divider = '────────────────────────────────────────';
  let preview = `\n${divider}\nTHREAD PREVIEW (${tweets.length} tweets)\n${divider}`;
  preview += `\nFeed: ${item.feed}`;
  preview += `\nID: ${item.id}`;
  preview += `\nMode: ${config.threadMode}`;
  preview += `\nPublished: ${item.pubDate || 'N/A'}`;
  preview += `\n${divider}`;

  tweets.forEach((tweet, idx) => {
    preview += `\n[${idx + 1}/${tweets.length}] (${tweet.length}/${MAX_TWEET_LENGTH} chars)`;
    preview += `\n${tweet}`;
    preview += `\n${divider}`;
  });

  return preview;
}
