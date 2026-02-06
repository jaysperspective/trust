import { config, logConfig } from './config.js';
import { logger } from './logger.js';
import { initDatabase, cleanOldQueueItems } from './db.js';
import { pollFeeds } from './feeds.js';
import { processQueue } from './queue.js';
import { verifyCredentials } from './xClient.js';
import { startServer, updatePollTime, setLastPollError, setRunning } from './server.js';

// Graceful shutdown flag
let isShuttingDown = false;

/**
 * Main polling loop iteration
 */
async function runPollCycle(): Promise<void> {
  if (isShuttingDown) return;

  logger.info('Starting poll cycle...');

  try {
    // Poll feeds and queue new items
    const { newsroomNew, latestNew } = await pollFeeds();

    // Update poll timestamps
    updatePollTime('newsroom');
    updatePollTime('latest');
    setLastPollError(null);

    logger.info('Poll cycle complete', { newsroomNew, latestNew });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Poll cycle failed', { error: errorMessage });
    setLastPollError(errorMessage);
  }
}

/**
 * Queue worker loop iteration
 */
async function runQueueWorker(): Promise<void> {
  if (isShuttingDown) return;

  try {
    await processQueue();
  } catch (error) {
    logger.error('Queue worker error', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Periodic maintenance tasks
 */
async function runMaintenance(): Promise<void> {
  if (isShuttingDown) return;

  try {
    // Clean old queue items (older than 30 days)
    const cleaned = cleanOldQueueItems(30);
    if (cleaned > 0) {
      logger.info(`Cleaned ${cleaned} old queue items`);
    }
  } catch (error) {
    logger.error('Maintenance error', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  logger.info('='.repeat(50));
  logger.info('RSS-X-Autoposter starting...');
  logger.info('='.repeat(50));

  // Log configuration
  logConfig();

  // Initialize database
  initDatabase();

  // Start HTTP server
  await startServer();

  // Verify X API credentials (skip in dry run)
  const credentials = await verifyCredentials();
  if (!credentials.valid && !config.dryRun) {
    logger.error('X API credential verification failed. Exiting.');
    process.exit(1);
  }
  if (credentials.valid) {
    logger.info(`Authenticated as @${credentials.username}`);
  }

  // Mark as running
  setRunning(true);
  logger.info('Service is now running');

  // Initial poll
  await runPollCycle();

  // Initial queue processing
  await runQueueWorker();

  // Set up polling interval
  const pollInterval = setInterval(async () => {
    await runPollCycle();
  }, config.pollIntervalSec * 1000);

  // Set up queue worker interval (runs more frequently)
  const queueInterval = setInterval(async () => {
    await runQueueWorker();
  }, 10 * 1000); // Every 10 seconds

  // Set up maintenance interval (once per hour)
  const maintenanceInterval = setInterval(async () => {
    await runMaintenance();
  }, 60 * 60 * 1000);

  // Graceful shutdown handlers
  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`Received ${signal}, shutting down gracefully...`);

    // Clear intervals
    clearInterval(pollInterval);
    clearInterval(queueInterval);
    clearInterval(maintenanceInterval);

    // Give time for in-flight operations to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Keep the process running
  logger.info(`Polling every ${config.pollIntervalSec} seconds`);
  logger.info(`Queue worker runs every 10 seconds`);
  if (config.dryRun) {
    logger.warn('DRY RUN MODE: Tweets will be logged but not posted');
  }
}

// Run the main function
main().catch((error) => {
  logger.error('Fatal error', { error: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
