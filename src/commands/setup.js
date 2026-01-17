/**
 * Setup command - configure bot settings for the server
 */
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { db, logger: baseLogger } = require('@{{APP_NAME}}/commons');

const logger = baseLogger.createLogger('commands');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure bot settings for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('view')
        .setDescription('View current server settings')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('prefix')
        .setDescription('Set the command prefix (for legacy commands)')
        .addStringOption((option) =>
          option
            .setName('prefix')
            .setDescription('The new prefix')
            .setRequired(true)
            .setMaxLength(5)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('logs')
        .setDescription('Set the log channel')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('The channel for bot logs')
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const prisma = db.prisma;

    // Ensure server exists in database
    let server = await prisma.server.findUnique({
      where: { discordId: interaction.guildId },
      include: { settings: true },
    });

    if (!server) {
      server = await prisma.server.create({
        data: {
          discordId: interaction.guildId,
          name: interaction.guild.name,
          memberCount: interaction.guild.memberCount,
          settings: { create: {} },
        },
        include: { settings: true },
      });
    }

    switch (subcommand) {
      case 'view':
        return handleView(interaction, server);
      case 'prefix':
        return handlePrefix(interaction, server, prisma);
      case 'logs':
        return handleLogs(interaction, server, prisma);
    }
  },
};

async function handleView(interaction, server) {
  const settings = server.settings;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('⚙️ Server Settings')
    .setDescription(`Settings for **${interaction.guild.name}**`)
    .addFields(
      {
        name: 'Prefix',
        value: `\`${settings?.prefix || '!'}\``,
        inline: true,
      },
      {
        name: 'Log Channel',
        value: settings?.logChannelId ? `<#${settings.logChannelId}>` : 'Not set',
        inline: true,
      },
      {
        name: 'Member Count',
        value: `${server.memberCount}`,
        inline: true,
      }
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handlePrefix(interaction, server, prisma) {
  const newPrefix = interaction.options.getString('prefix');

  await prisma.serverSettings.upsert({
    where: { serverId: server.id },
    update: { prefix: newPrefix },
    create: {
      serverId: server.id,
      prefix: newPrefix,
    },
  });

  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle('✅ Prefix Updated')
    .setDescription(`Command prefix has been set to \`${newPrefix}\``);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleLogs(interaction, server, prisma) {
  const channel = interaction.options.getChannel('channel');

  await prisma.serverSettings.upsert({
    where: { serverId: server.id },
    update: { logChannelId: channel.id },
    create: {
      serverId: server.id,
      logChannelId: channel.id,
    },
  });

  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle('✅ Log Channel Updated')
    .setDescription(`Bot logs will now be sent to ${channel}`);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}