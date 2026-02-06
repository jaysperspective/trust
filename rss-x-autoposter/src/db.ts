import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'autoposter.db');
export const db: DatabaseType = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

export function initDatabase(): void {
  logger.info('Initializing database...');

  // Create posted_items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS posted_items (
      id TEXT PRIMARY KEY,
      feed TEXT NOT NULL,
      title TEXT,
      link TEXT,
      pub_date TEXT,
      tweeted_at TEXT NOT NULL,
      tweet_id TEXT
    )
  `);

  // Create queue table
  db.exec(`
    CREATE TABLE IF NOT EXISTS queue (
      id TEXT PRIMARY KEY,
      feed TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      error_message TEXT
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_posted_items_feed ON posted_items(feed);
    CREATE INDEX IF NOT EXISTS idx_posted_items_tweeted_at ON posted_items(tweeted_at);
    CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status);
    CREATE INDEX IF NOT EXISTS idx_queue_next_attempt ON queue(next_attempt_at);
  `);

  logger.info('Database initialized successfully');
}

// Posted items operations
export interface PostedItem {
  id: string;
  feed: string;
  title: string | null;
  link: string | null;
  pubDate: string | null;
  tweetedAt: string;
  tweetId: string | null;
}

export function isItemPosted(id: string): boolean {
  const stmt = db.prepare('SELECT 1 FROM posted_items WHERE id = ?');
  return stmt.get(id) !== undefined;
}

export function markItemPosted(item: PostedItem): void {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO posted_items (id, feed, title, link, pub_date, tweeted_at, tweet_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(item.id, item.feed, item.title, item.link, item.pubDate, item.tweetedAt, item.tweetId);
}

export function getPostedItemsCount(): number {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM posted_items');
  const result = stmt.get() as { count: number };
  return result.count;
}

/**
 * Get the timestamp of the last posted story (for global throttle)
 */
export function getLastStoryPostedAt(): Date | null {
  const stmt = db.prepare('SELECT MAX(tweeted_at) as lastTweetedAt FROM posted_items');
  const result = stmt.get() as { lastTweetedAt: string | null };

  if (!result.lastTweetedAt) {
    return null;
  }

  return new Date(result.lastTweetedAt);
}

// Queue operations
export type QueueStatus = 'queued' | 'posting' | 'posted' | 'failed';

export interface QueueItem {
  id: string;
  feed: string;
  payloadJson: string;
  status: QueueStatus;
  attempts: number;
  nextAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
  errorMessage: string | null;
}

// Basic feed item (backward compatible)
export interface FeedItem {
  id: string;
  feed: 'NEWSROOM' | 'LATEST';
  title: string;
  link: string;
  pubDate: string | null;
}

// Extended feed item with content for threads
export interface FeedItemExtended extends FeedItem {
  content?: string | null;
}

export function isItemInQueue(id: string): boolean {
  const stmt = db.prepare("SELECT 1 FROM queue WHERE id = ? AND status IN ('queued', 'posting')");
  return stmt.get(id) !== undefined;
}

export function addToQueue(item: FeedItemExtended): void {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO queue (id, feed, payload_json, status, attempts, next_attempt_at, created_at, updated_at)
    VALUES (?, ?, ?, 'queued', 0, ?, ?, ?)
  `);
  stmt.run(item.id, item.feed, JSON.stringify(item), now, now, now);
}

export function getNextQueuedItem(): QueueItem | null {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    SELECT id, feed, payload_json as payloadJson, status, attempts,
           next_attempt_at as nextAttemptAt, created_at as createdAt,
           updated_at as updatedAt, error_message as errorMessage
    FROM queue
    WHERE status = 'queued' AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
    ORDER BY created_at ASC
    LIMIT 1
  `);
  return stmt.get(now) as QueueItem | null;
}

export function peekNextQueuedItem(): QueueItem | null {
  // Peek at the next item without checking next_attempt_at (for throttle scheduling)
  const stmt = db.prepare(`
    SELECT id, feed, payload_json as payloadJson, status, attempts,
           next_attempt_at as nextAttemptAt, created_at as createdAt,
           updated_at as updatedAt, error_message as errorMessage
    FROM queue
    WHERE status = 'queued'
    ORDER BY created_at ASC
    LIMIT 1
  `);
  return stmt.get() as QueueItem | null;
}

export function updateQueueItem(
  id: string,
  updates: Partial<{
    status: QueueStatus;
    attempts: number;
    nextAttemptAt: string | null;
    errorMessage: string | null;
  }>
): void {
  const now = new Date().toISOString();
  const fields: string[] = ['updated_at = ?'];
  const values: (string | number | null)[] = [now];

  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.attempts !== undefined) {
    fields.push('attempts = ?');
    values.push(updates.attempts);
  }
  if (updates.nextAttemptAt !== undefined) {
    fields.push('next_attempt_at = ?');
    values.push(updates.nextAttemptAt);
  }
  if (updates.errorMessage !== undefined) {
    fields.push('error_message = ?');
    values.push(updates.errorMessage);
  }

  values.push(id);
  const stmt = db.prepare(`UPDATE queue SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
}

export function getQueueStats(): { queued: number; posting: number; posted: number; failed: number } {
  const stmt = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM queue
    GROUP BY status
  `);
  const results = stmt.all() as Array<{ status: string; count: number }>;

  const stats = { queued: 0, posting: 0, posted: 0, failed: 0 };
  for (const row of results) {
    if (row.status in stats) {
      stats[row.status as keyof typeof stats] = row.count;
    }
  }
  return stats;
}

export function cleanOldQueueItems(daysOld: number = 30): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);
  const stmt = db.prepare(`
    DELETE FROM queue
    WHERE status IN ('posted', 'failed') AND updated_at < ?
  `);
  const result = stmt.run(cutoff.toISOString());
  return result.changes;
}
