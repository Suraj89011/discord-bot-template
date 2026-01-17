/**
 * Guild Create event - fired when bot joins a new server
 */
const { Events } = require('discord.js');
const { logger: baseLogger, db } = require('@{{APP_NAME}}/commons');

const logger = baseLogger.createLogger('bot');

module.exports = {
  name: Events.GuildCreate,
  async execute(guild) {
    logger.info(`Joined new guild: ${guild.name}`, {
      guildId: guild.id,
      memberCount: guild.memberCount,
      owner: guild.ownerId,
    });

    // Create server record in database
    try {
      const prisma = db.prisma;
      await prisma.server.upsert({
        where: { discordId: guild.id },
        update: {
          name: guild.name,
          memberCount: guild.memberCount,
          isActive: true,
        },
        create: {
          discordId: guild.id,
          name: guild.name,
          memberCount: guild.memberCount,
        },
      });
      logger.debug(`Server record created/updated for ${guild.name}`);
    } catch (error) {
      logger.error('Failed to create server record', { error: error.message });
    }
  },
};