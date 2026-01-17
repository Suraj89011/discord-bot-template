/**
 * Stats routes - bot statistics and analytics
 */
const express = require('express');
const { db, redis } = require('@{{APP_NAME}}/commons');

const router = express.Router();

/**
 * GET /api/stats - Get overall statistics
 */
router.get('/', async (req, res, next) => {
  try {
    // Try to get from cache first
    const cacheKey = 'stats:overview';
    const cached = await redis.cache.get(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    const prisma = db.prisma;
    
    const [userCount, serverCount, activeServerCount] = await Promise.all([
      prisma.user.count(),
      prisma.server.count(),
      prisma.server.count({ where: { isActive: true } }),
    ]);

    const stats = {
      users: userCount,
      servers: {
        total: serverCount,
        active: activeServerCount,
        inactive: serverCount - activeServerCount,
      },
      timestamp: new Date().toISOString(),
    };

    // Cache for 5 minutes
    await redis.cache.set(cacheKey, stats, 300);

    res.json({ success: true, data: stats, cached: false });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/stats/commands - Get command usage statistics
 */
router.get('/commands', async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const prisma = db.prisma;
    
    const commandStats = await prisma.commandUsage.groupBy({
      by: ['commandName'],
      _count: { commandName: true },
      where: {
        usedAt: { gte: since },
      },
      orderBy: { _count: { commandName: 'desc' } },
      take: 20,
    });

    const formatted = commandStats.map((stat) => ({
      command: stat.commandName,
      uses: stat._count.commandName,
    }));

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        commands: formatted,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/stats/servers/top - Get top servers by member count
 */
router.get('/servers/top', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const prisma = db.prisma;
    const servers = await prisma.server.findMany({
      where: { isActive: true },
      orderBy: { memberCount: 'desc' },
      take: parseInt(limit),
      select: {
        discordId: true,
        name: true,
        memberCount: true,
        createdAt: true,
      },
    });

    res.json({ success: true, data: servers });
  } catch (error) {
    next(error);
  }
});

module.exports = router;