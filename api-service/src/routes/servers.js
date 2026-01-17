/**
 * Server routes
 */
const express = require('express');
const { db, logger: baseLogger } = require('@{{APP_NAME}}/commons');

const router = express.Router();
const logger = baseLogger.createLogger('api:servers');

/**
 * GET /api/servers - List all servers
 */
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, active } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (active !== undefined) {
      where.isActive = active === 'true';
    }

    const prisma = db.prisma;
    const [servers, total] = await Promise.all([
      prisma.server.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: { settings: true },
      }),
      prisma.server.count({ where }),
    ]);

    res.json({
      success: true,
      data: servers,
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
 * GET /api/servers/:discordId - Get server by Discord ID
 */
router.get('/:discordId', async (req, res, next) => {
  try {
    const { discordId } = req.params;
    const prisma = db.prisma;

    const server = await prisma.server.findUnique({
      where: { discordId },
      include: {
        settings: true,
        _count: { select: { members: true } },
      },
    });

    if (!server) {
      return res.status(404).json({
        success: false,
        error: { message: 'Server not found', code: 'NOT_FOUND' },
      });
    }

    res.json({ success: true, data: server });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/servers - Create or update server
 */
router.post('/', async (req, res, next) => {
  try {
    const { discordId, name, memberCount, ownerId } = req.body;

    if (!discordId || !name) {
      return res.status(400).json({
        success: false,
        error: { message: 'discordId and name are required', code: 'VALIDATION_ERROR' },
      });
    }

    const prisma = db.prisma;
    const server = await prisma.server.upsert({
      where: { discordId },
      update: { name, memberCount, isActive: true },
      create: {
        discordId,
        name,
        memberCount: memberCount || 0,
        settings: { create: {} },
      },
      include: { settings: true },
    });

    logger.info(`Server created/updated: ${name}`, { discordId });
    res.status(201).json({ success: true, data: server });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/servers/:discordId/settings - Update server settings
 */
router.put('/:discordId/settings', async (req, res, next) => {
  try {
    const { discordId } = req.params;
    const { prefix, logChannelId, welcomeChannelId, welcomeMessage } = req.body;

    const prisma = db.prisma;
    
    // Find server first
    const server = await prisma.server.findUnique({ where: { discordId } });
    if (!server) {
      return res.status(404).json({
        success: false,
        error: { message: 'Server not found', code: 'NOT_FOUND' },
      });
    }

    const settings = await prisma.serverSettings.upsert({
      where: { serverId: server.id },
      update: { prefix, logChannelId, welcomeChannelId, welcomeMessage },
      create: {
        serverId: server.id,
        prefix,
        logChannelId,
        welcomeChannelId,
        welcomeMessage,
      },
    });

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/servers/:discordId - Delete server
 */
router.delete('/:discordId', async (req, res, next) => {
  try {
    const { discordId } = req.params;
    const prisma = db.prisma;

    // Soft delete - mark as inactive
    await prisma.server.update({
      where: { discordId },
      data: { isActive: false },
    });

    logger.info(`Server marked inactive`, { discordId });
    res.json({ success: true, message: 'Server marked as inactive' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: { message: 'Server not found', code: 'NOT_FOUND' },
      });
    }
    next(error);
  }
});

module.exports = router;