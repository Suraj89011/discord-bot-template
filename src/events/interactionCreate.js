/**
 * Interaction Create event - handles slash commands and other interactions
 */
const { Events, Collection } = require('discord.js');
const { logger: baseLogger } = require('@{{APP_NAME}}/commons');

const logger = baseLogger.createLogger('commands');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
    }
    // Handle button interactions
    else if (interaction.isButton()) {
      await handleButton(interaction);
    }
    // Handle select menus
    else if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(interaction);
    }
    // Handle modals
    else if (interaction.isModalSubmit()) {
      await handleModal(interaction);
    }
  },
};

/**
 * Handle slash command interactions
 */
async function handleCommand(interaction) {
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`Unknown command: ${interaction.commandName}`);
    return;
  }

  // Check cooldowns
  const cooldowns = interaction.client.cooldowns;
  if (!cooldowns.has(command.data.name)) {
    cooldowns.set(command.data.name, new Collection());
  }

  const now = Date.now();
  const timestamps = cooldowns.get(command.data.name);
  const cooldownAmount = (command.cooldown ?? 3) * 1000;

  if (timestamps.has(interaction.user.id)) {
    const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

    if (now < expirationTime) {
      const timeLeft = (expirationTime - now) / 1000;
      return interaction.reply({
        content: `Please wait ${timeLeft.toFixed(1)} more seconds before using \`/${command.data.name}\` again.`,
        ephemeral: true,
      });
    }
  }

  timestamps.set(interaction.user.id, now);
  setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

  try {
    logger.info(`Command executed: /${interaction.commandName}`, {
      user: interaction.user.tag,
      userId: interaction.user.id,
      guild: interaction.guild?.name,
      guildId: interaction.guildId,
    });

    await command.execute(interaction);
  } catch (error) {
    logger.error(`Error executing command: ${interaction.commandName}`, {
      error: error.message,
      stack: error.stack,
    });

    const errorMessage = {
      content: 'There was an error executing this command.',
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage);
    } else {
      await interaction.reply(errorMessage);
    }
  }
}

/**
 * Handle button interactions
 */
async function handleButton(interaction) {
  logger.debug(`Button clicked: ${interaction.customId}`, {
    user: interaction.user.tag,
  });

  // Handle specific button IDs here
  // Example: if (interaction.customId === 'my-button') { ... }
}

/**
 * Handle select menu interactions
 */
async function handleSelectMenu(interaction) {
  logger.debug(`Select menu used: ${interaction.customId}`, {
    user: interaction.user.tag,
    values: interaction.values,
  });

  // Handle specific select menu IDs here
}

/**
 * Handle modal submissions
 */
async function handleModal(interaction) {
  logger.debug(`Modal submitted: ${interaction.customId}`, {
    user: interaction.user.tag,
  });

  // Handle specific modal IDs here
}