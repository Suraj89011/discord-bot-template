/**
 * User routes
 */
const express = require('express');
const { db, logger: baseLogger } = require('@{{APP_NAME}}/commons');

const router = express.Router();
const logger = baseLogger.createLogger('api:users');

/**
 * GET /api/users - List all users
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const prisma = db.prisma;
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count(),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/:discordId - Get user by Discord ID
 */
router.get('/:discordId', async (req, res, next) => {
  try {
    const { discordId } = req.params;
    const prisma = db.prisma;

    const user = await prisma.user.findUnique({
      where: { discordId },
      include: { servers: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found', code: 'NOT_FOUND' },
      });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users - Create user
 */
router.post('/', async (req, res, next) => {
  try {
    const { discordId, username, discriminator, avatar } = req.body;

    if (!discordId || !username) {
      return res.status(400).json({
        success: false,
        error: { message: 'discordId and username are required', code: 'VALIDATION_ERROR' },
      });
    }

    const prisma = db.prisma;
    const user = await prisma.user.upsert({
      where: { discordId },
      update: { username, discriminator, avatar },
      create: { discordId, username, discriminator, avatar },
    });

    logger.info(`User created/updated: ${username}`, { discordId });
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/users/:discordId - Update user
 */
router.put('/:discordId', async (req, res, next) => {
  try {
    const { discordId } = req.params;
    const { username, discriminator, avatar } = req.body;

    const prisma = db.prisma;
    const user = await prisma.user.update({
      where: { discordId },
      data: { username, discriminator, avatar },
    });

    res.json({ success: true, data: user });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found', code: 'NOT_FOUND' },
      });
    }
    next(error);
  }
});

/**
 * DELETE /api/users/:discordId - Delete user
 */
router.delete('/:discordId', async (req, res, next) => {
  try {
    const { discordId } = req.params;
    const prisma = db.prisma;

    await prisma.user.delete({ where: { discordId } });
    logger.info(`User deleted`, { discordId });

    res.json({ success: true, message: 'User deleted' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found', code: 'NOT_FOUND' },
      });
    }
    next(error);
  }
});

module.exports = router;