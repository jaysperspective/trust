# RSS-X-Autoposter

A production-ready RSS to X (Twitter) autoposter service. Polls two RSS feeds on a schedule and posts new items to X with deduplication, rate limiting, and burst protection.

## Features

- **Dual Feed Support**: Polls two RSS feeds (NEWSROOM and LATEST) with configurable intervals
- **Smart Deduplication**: Never posts the same item twice, even across restarts (SQLite-backed)
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

# Optional settings
POLL_INTERVAL_SEC=300
DRY_RUN=false
PORT=3100
HASHTAGS=#YourHashtag
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

## Configuration Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `X_API_KEY` | Yes | - | X API consumer key |
| `X_API_SECRET` | Yes | - | X API consumer secret |
| `X_ACCESS_TOKEN` | Yes | - | X access token |
| `X_ACCESS_SECRET` | Yes | - | X access token secret |
| `FEED_NEWSROOM_URL` | Yes | - | Newsroom RSS feed URL |
| `FEED_LATEST_URL` | Yes | - | Latest RSS feed URL |
| `POLL_INTERVAL_SEC` | No | 300 | Seconds between feed polls |
| `MAX_NEW_ITEMS_PER_FEED_PER_POLL` | No | 3 | Max new items to queue per feed per cycle |
| `MIN_DELAY_BETWEEN_POSTS_SEC` | No | 90 | Minimum seconds between tweets |
| `MAX_RETRIES` | No | 5 | Max retry attempts for failed posts |
| `DRY_RUN` | No | false | If true, logs tweets without posting |
| `PORT` | No | 3100 | HTTP server port for health endpoint |
| `HASHTAGS` | No | - | Comma-separated hashtags to append |
| `TIMEZONE` | No | UTC | Timezone for logging |

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
- Increase `MIN_DELAY_BETWEEN_POSTS_SEC` (e.g., to 1800 for 30 min)
- Reduce `MAX_NEW_ITEMS_PER_FEED_PER_POLL`

### Duplicate tweets appearing

- Check if items have unique GUIDs in RSS
- The service deduplicates by: GUID > link > hash(title+pubDate)
- Inspect `posted_items` table for existing entries

### Service not starting

1. Check logs: `pm2 logs` or `journalctl -u rss-x-autoposter`
2. Verify `.env` file exists and has correct format
3. Run manually to see errors: `npm start`

### Feed not being parsed

- Verify feed URL is accessible: `curl -I <FEED_URL>`
- Check if feed is valid RSS/Atom XML
- Look for parse errors in logs

## Tweet Format

Tweets are formatted as:
```
[NEWSROOM] Article Title Here
https://example.com/article-url #Hashtag
```

- Title is truncated with "…" if needed to fit 280 chars
- Links are automatically shortened by X (t.co)
- Hashtags are appended if they fit

## Development

```bash
# Run with hot reload
npm run dev

# Run in dry mode
DRY_RUN=true npm run dev

# Build for production
npm run build

# Clean build artifacts
npm run clean
```

## Architecture

```
src/
├── index.ts      # Main orchestrator (poll loop + queue worker)
├── config.ts     # Environment validation (zod)
├── logger.ts     # Winston logging setup
├── db.ts         # SQLite database operations
├── feeds.ts      # RSS feed parsing and normalization
├── formatter.ts  # Tweet text formatting
├── xClient.ts    # X API client (OAuth 1.0a)
├── queue.ts      # Queue processing with retry logic
└── server.ts     # Express health/metrics endpoints
```

## Deployment Checklist

- [ ] Node.js 20+ installed
- [ ] `.env` file created with all credentials
- [ ] `npm install` completed
- [ ] `npm run build` successful
- [ ] Dry run test passed (`npm run dry-run`)
- [ ] Health endpoint accessible
- [ ] PM2/systemd configured for auto-restart
- [ ] Logs directory writable
- [ ] Firewall allows outbound HTTPS (api.x.com)

## License

MIT
