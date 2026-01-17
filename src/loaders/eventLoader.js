/**
 * Event loader - dynamically loads event handlers
 */
const fs = require('fs');
const path = require('path');
const { logger: baseLogger } = require('@{{APP_NAME}}/commons');

const logger = baseLogger.createLogger('events');

/**
 * Load all events from the events directory
 * @param {import('discord.js').Client} client
 */
async function loadEvents(client) {
  const eventsPath = path.join(__dirname, '..', 'events');
  
  if (!fs.existsSync(eventsPath)) {
    logger.warn('Events directory not found');
    return;
  }

  const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));
  let loadedCount = 0;

  for (const file of eventFiles) {
    try {
      const event = require(path.join(eventsPath, file));

      if ('name' in event && 'execute' in event) {
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args));
        } else {
          client.on(event.name, (...args) => event.execute(...args));
        }
        logger.debug(`Loaded event: ${event.name}`);
        loadedCount++;
      } else {
        logger.warn(`Event ${file} is missing required "name" or "execute" property`);
      }
    } catch (error) {
      logger.error(`Failed to load event ${file}`, { error: error.message });
    }
  }

  logger.info(`Loaded ${loadedCount} events`);
}

module.exports = {
  loadEvents,
};