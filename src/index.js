/**
 * {{APP_TITLE}} - Discord Bot Service
 * Main entry point for the Discord bot
 */
const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const express = require('express');
const { config, logger: baseLogger, db, redis } = require('@{{APP_NAME}}/commons');

// Create service logger
const logger = baseLogger.createLogger('bot');

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
});

// Collections for commands and events
client.commands = new Collection();
client.cooldowns = new Collection();

// Load handlers
const { loadCommands, registerCommands } = require('./loaders/commandLoader');
const { loadEvents } = require('./loaders/eventLoader');

/**
 * Initialize the bot
 */
async function initialize() {
  try {
    logger.info('Starting {{APP_TITLE}} bot...');

    // Connect to database
    await db.connect();

    // Connect to Redis (if enabled)
    await redis.connect();

    // Load commands and events
    await loadCommands(client);
    await loadEvents(client);

    // Login to Discord
    await client.login(config.discord.token);

    // Register slash commands after ready
    client.once('ready', async () => {
      logger.info(`Logged in as ${client.user.tag}`);
      logger.info(`Serving ${client.guilds.cache.size} guilds`);

      // Register slash commands
      await registerCommands(client);
    });
  } catch (error) {
    logger.error('Failed to initialize bot', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

/**
 * Health check Express server
 */
function startHealthServer() {
  const app = express();

  // Health check endpoint
  app.get('/health', async (req, res) => {
    const dbHealthy = await db.healthCheck();
    const redisHealthy = await redis.healthCheck();
    const discordHealthy = client.isReady();

    const healthy = dbHealthy && redisHealthy && discordHealthy;

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'up' : 'down',
        redis: redisHealthy ? 'up' : 'down',
        discord: discordHealthy ? 'connected' : 'disconnected',
      },
      discord: discordHealthy ? {
        guilds: client.guilds.cache.size,
        user: client.user?.tag,
      } : null,
    });
  });

  // Readiness probe
  app.get('/ready', (req, res) => {
    if (client.isReady()) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready' });
    }
  });

  // Liveness probe
  app.get('/live', (req, res) => {
    res.status(200).json({ status: 'alive' });
  });

  const port = config.bot.port;
  app.listen(port, () => {
    logger.info(`Health server listening on port ${port}`);
  });
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    // Destroy Discord client
    client.destroy();
    logger.info('Discord client disconnected');

    // Disconnect from Redis
    await redis.disconnect();

    // Disconnect from database
    await db.disconnect();

    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
});

// Start the bot
startHealthServer();
initialize();