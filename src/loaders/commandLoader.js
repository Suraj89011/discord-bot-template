/**
 * Command loader - dynamically loads slash commands
 */
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const { config, logger: baseLogger } = require('@{{APP_NAME}}/commons');

const logger = baseLogger.createLogger('commands');

/**
 * Load all commands from the commands directory
 * @param {import('discord.js').Client} client
 */
async function loadCommands(client) {
  const commandsPath = path.join(__dirname, '..', 'commands');
  
  if (!fs.existsSync(commandsPath)) {
    logger.warn('Commands directory not found');
    return;
  }

  const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    try {
      const command = require(path.join(commandsPath, file));

      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        logger.debug(`Loaded command: ${command.data.name}`);
      } else {
        logger.warn(`Command ${file} is missing required "data" or "execute" property`);
      }
    } catch (error) {
      logger.error(`Failed to load command ${file}`, { error: error.message });
    }
  }

  logger.info(`Loaded ${client.commands.size} commands`);
}

/**
 * Register slash commands with Discord API
 * @param {import('discord.js').Client} client
 */
async function registerCommands(client) {
  const commands = client.commands.map((cmd) => cmd.data.toJSON());

  if (commands.length === 0) {
    logger.warn('No commands to register');
    return;
  }

  const rest = new REST().setToken(config.discord.token);

  try {
    logger.info(`Registering ${commands.length} slash commands...`);

    // Register globally (for production) or to a specific guild (for development)
    if (config.discord.guildId && config.app.isDevelopment) {
      // Guild commands update instantly - good for development
      await rest.put(
        Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
        { body: commands }
      );
      logger.info(`Registered ${commands.length} commands to guild ${config.discord.guildId}`);
    } else {
      // Global commands take up to an hour to propagate
      await rest.put(
        Routes.applicationCommands(config.discord.clientId),
        { body: commands }
      );
      logger.info(`Registered ${commands.length} global commands`);
    }
  } catch (error) {
    logger.error('Failed to register commands', { error: error.message });
  }
}

module.exports = {
  loadCommands,
  registerCommands,
};