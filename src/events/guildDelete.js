/**
 * Guild Delete event - fired when bot is removed from a server
 */
const { Events } = require('discord.js');
const { logger: baseLogger, db } = require('@{{APP_NAME}}/commons');

const logger = baseLogger.createLogger('bot');

module.exports = {
  name: Events.GuildDelete,
  async execute(guild) {
    logger.info(`Left guild: ${guild.name}`, {
      guildId: guild.id,
    });

    // Mark server as inactive in database
    try {
      const prisma = db.prisma;
      await prisma.server.update({
        where: { discordId: guild.id },
        data: { isActive: false },
      });
      logger.debug(`Server ${guild.name} marked as inactive`);
    } catch (error) {
      // Server might not exist in DB
      logger.debug('Failed to update server record', { error: error.message });
    }
  },
};