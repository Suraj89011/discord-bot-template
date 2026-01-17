/**
 * {{APP_TITLE}} - API Service
 * Express REST API for bot management
 */
require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { config, logger: baseLogger, db, redis, middleware } = require('@{{APP_NAME}}/commons');

// Create service logger
const logger = baseLogger.createLogger('api');

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.dashboard.url,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(middleware.requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { success: false, error: { message: 'Too many requests', code: 'RATE_LIMITED' } },
});
app.use('/api/', limiter);

// Health endpoints (no auth required)
app.get('/health', async (req, res) => {
  const dbHealthy = await db.healthCheck();
  const redisHealthy = await redis.healthCheck();
  const healthy = dbHealthy && redisHealthy;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    service: 'api',
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: dbHealthy ? 'up' : 'down',
      redis: redisHealthy ? 'up' : 'down',
    },
  });
});

app.get('/ready', async (req, res) => {
  const dbHealthy = await db.healthCheck();
  if (dbHealthy) {
    res.status(200).json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});

app.get('/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// API routes (auth required)
const apiRouter = express.Router();
apiRouter.use(middleware.apiKeyAuth);

// Mount route modules
apiRouter.use('/users', require('./routes/users'));
apiRouter.use('/servers', require('./routes/servers'));
apiRouter.use('/stats', require('./routes/stats'));

app.use('/api', apiRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Not found',
      code: 'NOT_FOUND',
    },
  });
});

// Error handler
app.use(middleware.errorHandler);

/**
 * Initialize the API service
 */
async function initialize() {
  try {
    logger.info('Starting API service...');

    // Connect to database
    await db.connect();

    // Connect to Redis (if enabled)
    await redis.connect();

    // Start server
    const port = config.api.port;
    app.listen(port, () => {
      logger.info(`API service listening on port ${port}`);
    });
  } catch (error) {
    logger.error('Failed to initialize API service', { error: error.message });
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    await redis.disconnect();
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

// Start the service
initialize();