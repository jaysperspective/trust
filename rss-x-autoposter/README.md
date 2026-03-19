# RSS-X-Autoposter

A production-ready RSS to X (Twitter) autoposter service. Polls two RSS feeds on a schedule and posts new items to X with deduplication, rate limiting, burst protection, and optional thread support.

## Features

- **Dual Feed Support**: Polls two RSS feeds (NEWSROOM and LATEST) with configurable intervals
- **Smart Deduplication**: Never posts the same item twice, even across restarts (SQLite-backed)
- **Localhost URL Replacement**: Automatically replaces localhost:3000 URLs with your production BASE_PUBLIC_URL
- **Thread Modes**: Post as single tweets, summary threads, or full article threads
- **Global Hourly Throttle**: Limit posting to one story per hour across both feeds
- **Burst Protection**: Limits new items per poll cycle and enforces minimum delay between posts
- **Retry with Backoff**: Failed posts are retried with exponential backoff
- **Dry Run Mode**: Test without posting to X
- **Health Endpoint**: HTTP `/health` endpoint for monitoring
- **Structured Logging**: Console + rotating file logs
- **Graceful Shutdown**: Handles SIGTERM/SIGINT properly

## Prerequisites

- Node.js 20+
- X Developer App with OAuth 1.0a credentials (read and write access)
- Two RSS feed URLs to monitor

## Quick Start

### 1. Clone and Install

```bash
cd rss-x-autoposter
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# X API Credentials (required)
X_API_KEY=your_consumer_api_key
X_API_SECRET=your_consumer_api_secret
X_ACCESS_TOKEN=your_access_token
X_ACCESS_SECRET=your_access_token_secret

# RSS Feed URLs (required)
FEED_NEWSROOM_URL=https://your-site.com/newsroom/feed.xml
FEED_LATEST_URL=https://your-site.com/latest/feed.xml

# Base URL for localhost replacement
BASE_PUBLIC_URL=https://plusntrust.org

# Thread mode (off, summary, full)
THREAD_MODE=off

# Global throttle (one story per hour)
MIN_TIME_BETWEEN_STORIES_SEC=3600

# Optional settings
POLL_INTERVAL_SEC=300
DRY_RUN=false
PORT=3100
```

### 3. Build

```bash
npm run build
```

### 4. Run

**Development (with hot reload):**
```bash
npm run dev
```

**Dry run (no actual tweets):**
```bash
npm run dry-run
```

**Production:**
```bash
npm start
```

## Thread Modes

### `THREAD_MODE=off` (Default)
Single tweet per item:
```
[NEWSROOM] Article Title Here
https://example.com/article-url
```

### `THREAD_MODE=summary`
Multi-tweet thread with bullet-point summary:
```
Tweet 1: [NEWSROOM] Article Title
         First sentence hook

Tweet 2: • Key point one from the article...

Tweet 3: • Another important point...

Tweet N: Read: https://example.com/article-url
```

### `THREAD_MODE=full`
Multi-tweet thread with full article content:
```
Tweet 1: [NEWSROOM] Article Title

Tweet 2: First paragraph of article content...

Tweet 3: Next paragraph continues here...

Tweet N: Read: https://example.com/article-url
```

## Configuration Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `X_API_KEY` | Yes | - | X API consumer key |
| `X_API_SECRET` | Yes | - | X API consumer secret |
| `X_ACCESS_TOKEN` | Yes | - | X access token |
| `X_ACCESS_SECRET` | Yes | - | X access token secret |
| `FEED_NEWSROOM_URL` | Yes | - | Newsroom RSS feed URL |
| `FEED_LATEST_URL` | Yes | - | Latest RSS feed URL |
| `BASE_PUBLIC_URL` | No | https://plusntrust.org | Replaces localhost URLs in feeds |
| `POLL_INTERVAL_SEC` | No | 300 | Seconds between feed polls |
| `MAX_NEW_ITEMS_PER_FEED_PER_POLL` | No | 3 | Max new items to queue per feed per cycle |
| `MIN_DELAY_BETWEEN_POSTS_SEC` | No | 90 | Minimum seconds between items/threads |
| `MIN_TIME_BETWEEN_STORIES_SEC` | No | 3600 | Global throttle: min seconds between stories (0 to disable) |
| `MAX_RETRIES` | No | 5 | Max retry attempts for failed posts |
| `THREAD_MODE` | No | off | Thread mode: off, summary, full |
| `THREAD_MAX_TWEETS` | No | 8 | Maximum tweets per thread |
| `THREAD_APPEND_LINK_LAST` | No | true | Add link as final tweet |
| `THREAD_FIRST_TWEET_PREFIX_MODE` | No | tag | First tweet prefix: tag or none |
| `THREAD_DELAY_BETWEEN_TWEETS_SEC` | No | 10 | Delay between tweets in a thread |
| `DRY_RUN` | No | false | If true, logs tweets without posting |
| `PORT` | No | 3100 | HTTP server port for health endpoint |
| `HASHTAGS` | No | - | Comma-separated hashtags (single-tweet mode only) |
| `TIMEZONE` | No | UTC | Timezone for logging |

## Localhost URL Replacement

If your RSS feed contains localhost URLs (common during development), they will be automatically replaced:

| Feed URL | Becomes |
|----------|---------|
| `http://localhost:3000/p/abc123` | `https://plusntrust.org/p/abc123` |
| `https://localhost:3000/newsroom/story` | `https://plusntrust.org/newsroom/story` |

This applies to:
- Item links
- Item GUIDs
- Ensures HTTPS when BASE_PUBLIC_URL uses HTTPS

## Global Hourly Throttle

The `MIN_TIME_BETWEEN_STORIES_SEC` setting ensures you don't flood your followers:

- **Default: 3600** (one story per hour)
- Applies globally across both NEWSROOM and LATEST feeds
- Each "story" is one queue item (whether single tweet or full thread)
- Set to `0` to disable the throttle

When throttled, queued items are rescheduled for later rather than dropped.

## Deployment

### Option A: PM2 (Recommended)

1. Install PM2 globally:
```bash
npm install -g pm2
```

2. Start the service:
```bash
pm2 start ecosystem.config.cjs
```

3. Enable startup persistence:
```bash
pm2 startup
pm2 save
```

4. Useful PM2 commands:
```bash
pm2 status                    # Check status
pm2 logs rss-x-autoposter     # View logs
pm2 restart rss-x-autoposter  # Restart
pm2 stop rss-x-autoposter     # Stop
pm2 delete rss-x-autoposter   # Remove
```

### Option B: systemd

1. Copy the service file:
```bash
sudo cp rss-x-autoposter.service /etc/systemd/system/
```

2. Edit the service file to match your paths:
```bash
sudo nano /etc/systemd/system/rss-x-autoposter.service
```

3. Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable rss-x-autoposter
sudo systemctl start rss-x-autoposter
```

4. Useful systemd commands:
```bash
sudo systemctl status rss-x-autoposter    # Check status
sudo journalctl -u rss-x-autoposter -f    # View logs
sudo systemctl restart rss-x-autoposter   # Restart
sudo systemctl stop rss-x-autoposter      # Stop
```

## Health Check

The service exposes HTTP endpoints:

**Health status:**
```bash
curl http://localhost:3100/health
```

Response:
```json
{
  "status": "healthy",
  "uptime": 3600,
  "dryRun": false,
  "polling": {
    "newsroom": { "lastPoll": "2024-01-15T10:00:00.000Z" },
    "latest": { "lastPoll": "2024-01-15T10:00:00.000Z" },
    "lastError": null
  },
  "posting": {
    "lastPost": "2024-01-15T09:55:00.000Z",
    "lastError": null
  },
  "queue": {
    "pending": 2,
    "posting": 0,
    "posted": 150,
    "failed": 1
  }
}
```

**Metrics:**
```bash
curl http://localhost:3100/metrics
```

## Logs

Logs are stored in `data/logs/`:

- `autoposter-YYYY-MM-DD.log` - All logs (rotated daily, kept 14 days)
- `error-YYYY-MM-DD.log` - Errors only (kept 30 days)
- `exceptions.log` - Uncaught exceptions

## Database

SQLite database is stored at `data/autoposter.db`. Tables:

- `posted_items` - Record of all posted items (for deduplication)
- `queue` - Items waiting to be posted

To inspect the database:
```bash
sqlite3 data/autoposter.db
.tables
SELECT COUNT(*) FROM posted_items;
SELECT * FROM queue WHERE status = 'queued';
```

## Troubleshooting

### "X API credential verification failed"

- Verify your credentials in `.env`
- Ensure your X app has read and write permissions
- Check if your access token has been revoked
- Test with `DRY_RUN=true` to bypass credential check

### "Rate limited by X API"

- X free tier allows ~50 tweets per 24 hours
- Increase `MIN_TIME_BETWEEN_STORIES_SEC` (e.g., 7200 for 2 hours)
- Reduce `MAX_NEW_ITEMS_PER_FEED_PER_POLL`

### Localhost URLs appearing in tweets

- Ensure `BASE_PUBLIC_URL` is set correctly in `.env`
- Check that the URL uses the same protocol (http/https) as your production site

### Duplicate tweets appearing

- Check if items have unique GUIDs in RSS
- The service deduplicates by: GUID > link > hash(title+pubDate)
- Inspect `posted_items` table for existing entries

### Thread posting failed mid-thread

- Check logs for "Thread partially posted" messages
- Partial threads are marked as failed to prevent duplicates
- Manually delete partial thread on X and reset queue if needed

### Service not starting

1. Check logs: `pm2 logs` or `journalctl -u rss-x-autoposter`
2. Verify `.env` file exists and has correct format
3. Run manually to see errors: `npm start`

### Feed not being parsed

- Verify feed URL is accessible: `curl -I <FEED_URL>`
- Check if feed is valid RSS/Atom XML
- Look for parse errors in logs

## Development

```bash
# Run with hot reload
npm run dev

# Run in dry mode (preview threads without posting)
DRY_RUN=true npm run dev

# Test thread mode
DRY_RUN=true THREAD_MODE=summary npm run dev

# Build for production
npm run build

# Clean build artifacts
npm run clean
```

## Architecture

```
src/
├── index.ts           # Main orchestrator (poll loop + queue worker)
├── config.ts          # Environment validation (zod)
├── logger.ts          # Winston logging setup
├── db.ts              # SQLite database operations
├── feeds.ts           # RSS feed parsing and URL normalization
├── formatter.ts       # Backward-compatible exports
├── threadFormatter.ts # Tweet/thread text building
├── xClient.ts         # X API client (OAuth 1.0a, thread posting)
├── queue.ts           # Queue processing with throttle + retry logic
└── server.ts          # Express health/metrics endpoints
```

## Deployment Checklist

- [ ] Node.js 20+ installed
- [ ] `.env` file created with all credentials
- [ ] `BASE_PUBLIC_URL` set (no localhost URLs in production)
- [ ] `npm install` completed
- [ ] `npm run build` successful
- [ ] Dry run test passed (`npm run dry-run`)
- [ ] Thread mode tested if using (`DRY_RUN=true THREAD_MODE=summary npm run dev`)
- [ ] Health endpoint accessible
- [ ] PM2/systemd configured for auto-restart
- [ ] Logs directory writable
- [ ] Firewall allows outbound HTTPS (api.x.com)

## License

MIT
