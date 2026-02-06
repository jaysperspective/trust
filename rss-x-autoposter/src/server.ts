import express from 'express';
import { config } from './config.js';
import { logger } from './logger.js';
import { getQueueStats, getPostedItemsCount } from './db.js';
import { getLastPostTime, getLastPostError } from './queue.js';

const app = express();

// Track polling state
let lastPollTime: { newsroom: Date | null; latest: Date | null } = {
  newsroom: null,
  latest: null,
};
let lastPollError: string | null = null;
let isRunning = false;
let startTime: Date | null = null;

export function updatePollTime(feed: 'newsroom' | 'latest'): void {
  lastPollTime[feed] = new Date();
}

export function setLastPollError(error: string | null): void {
  lastPollError = error;
}

export function setRunning(running: boolean): void {
  isRunning = running;
  if (running && !startTime) {
    startTime = new Date();
  }
}

// Health check endpoint
app.get('/health', (_req, res) => {
  const queueStats = getQueueStats();
  const postedCount = getPostedItemsCount();
  const lastPostTime = getLastPostTime();
  const lastPostError = getLastPostError();

  const health = {
    status: isRunning ? 'healthy' : 'starting',
    uptime: startTime ? Math.round((Date.now() - startTime.getTime()) / 1000) : 0,
    dryRun: config.dryRun,
    polling: {
      newsroom: {
        lastPoll: lastPollTime.newsroom?.toISOString() || null,
        feedUrl: config.feedNewsroomUrl,
      },
      latest: {
        lastPoll: lastPollTime.latest?.toISOString() || null,
        feedUrl: config.feedLatestUrl,
      },
      lastError: lastPollError,
      intervalSec: config.pollIntervalSec,
    },
    posting: {
      lastPost: lastPostTime?.toISOString() || null,
      lastError: lastPostError,
      minDelaySec: config.minDelayBetweenPostsSec,
    },
    queue: {
      pending: queueStats.queued,
      posting: queueStats.posting,
      posted: queueStats.posted,
      failed: queueStats.failed,
    },
    stats: {
      totalPosted: postedCount,
    },
    timestamp: new Date().toISOString(),
  };

  const statusCode = isRunning ? 200 : 503;
  res.status(statusCode).json(health);
});

// Metrics endpoint (simple JSON format)
app.get('/metrics', (_req, res) => {
  const queueStats = getQueueStats();
  const postedCount = getPostedItemsCount();
  const lastPostTime = getLastPostTime();

  const metrics = {
    // Counters
    autoposter_items_posted_total: postedCount,
    autoposter_queue_pending: queueStats.queued,
    autoposter_queue_posting: queueStats.posting,
    autoposter_queue_failed: queueStats.failed,

    // Gauges
    autoposter_running: isRunning ? 1 : 0,
    autoposter_dry_run: config.dryRun ? 1 : 0,
    autoposter_uptime_seconds: startTime ? Math.round((Date.now() - startTime.getTime()) / 1000) : 0,

    // Timestamps (as unix epoch seconds)
    autoposter_last_post_timestamp: lastPostTime ? Math.round(lastPostTime.getTime() / 1000) : 0,
    autoposter_last_poll_newsroom_timestamp: lastPollTime.newsroom
      ? Math.round(lastPollTime.newsroom.getTime() / 1000)
      : 0,
    autoposter_last_poll_latest_timestamp: lastPollTime.latest
      ? Math.round(lastPollTime.latest.getTime() / 1000)
      : 0,
  };

  res.json(metrics);
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'RSS-X-Autoposter',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      metrics: '/metrics',
    },
  });
});

export function startServer(): Promise<void> {
  return new Promise((resolve) => {
    app.listen(config.port, () => {
      logger.info(`HTTP server listening on port ${config.port}`);
      logger.info(`Health check: http://localhost:${config.port}/health`);
      resolve();
    });
  });
}
