/**
 * Ready event - fired when the bot is connected and ready
 */
const { Events } = require('discord.js');
const { logger: baseLogger } = require('@{{APP_NAME}}/commons');

const logger = baseLogger.createLogger('bot');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    logger.info(`Bot is ready! Logged in as ${client.user.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds`);

    // Set bot presence
    client.user.setPresence({
      activities: [{ name: '/help | {{APP_TITLE}}', type: 3 }], // Watching
      status: 'online',
    });
  },
};