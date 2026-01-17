/**
 * Help command - display available commands
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Display available commands and information')
    .addStringOption((option) =>
      option
        .setName('command')
        .setDescription('Get help for a specific command')
        .setRequired(false)
    ),
  async execute(interaction) {
    const commandName = interaction.options.getString('command');
    const commands = interaction.client.commands;

    if (commandName) {
      // Show help for specific command
      const command = commands.get(commandName);

      if (!command) {
        return interaction.reply({
          content: `Command \`${commandName}\` not found.`,
          ephemeral: true,
        });
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`Command: /${command.data.name}`)
        .setDescription(command.data.description)
        .addFields(
          { name: 'Cooldown', value: `${command.cooldown ?? 3} seconds`, inline: true }
        );

      // Add options if any
      if (command.data.options?.length > 0) {
        const optionsText = command.data.options
          .map((opt) => `\`${opt.name}\` - ${opt.description}`)
          .join('\n');
        embed.addFields({ name: 'Options', value: optionsText });
      }

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Show all commands
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('{{APP_TITLE}} - Commands')
      .setDescription('Here are all available commands:')
      .setTimestamp();

    const commandList = commands.map(
      (cmd) => `\`/${cmd.data.name}\` - ${cmd.data.description}`
    );

    embed.addFields({
      name: 'Commands',
      value: commandList.join('\n') || 'No commands available',
    });

    embed.setFooter({
      text: 'Use /help <command> for more info on a specific command',
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};