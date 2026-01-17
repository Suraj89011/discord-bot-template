/**
 * Status command - show bot status and statistics
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db, redis } = require('@{{APP_NAME}}/commons');
const os = require('os');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Show bot status and system information'),
  cooldown: 10,
  async execute(interaction) {
    await interaction.deferReply();

    const client = interaction.client;

    // Calculate uptime
    const uptime = formatUptime(client.uptime);

    // Get database status
    const dbHealthy = await db.healthCheck();

    // Get Redis status
    const redisHealthy = await redis.healthCheck();

    // Memory usage
    const memUsage = process.memoryUsage();
    const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const memTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('📊 Bot Status')
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        {
          name: '🤖 Bot Info',
          value: [
            `**Uptime:** ${uptime}`,
            `**Guilds:** ${client.guilds.cache.size}`,
            `**Users:** ${client.users.cache.size}`,
            `**Commands:** ${client.commands.size}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: '💻 System',
          value: [
            `**Platform:** ${os.platform()}`,
            `**Node.js:** ${process.version}`,
            `**Memory:** ${memUsedMB}/${memTotalMB} MB`,
            `**CPU:** ${os.cpus()[0].model.split(' ')[0]}`,
          ].join('\n'),
          inline: true,
        },
        {
          name: '🔌 Services',
          value: [
            `**Database:** ${dbHealthy ? '✅ Connected' : '❌ Disconnected'}`,
            `**Redis:** ${redisHealthy ? '✅ Connected' : '⚪ Disabled'}`,
            `**Discord:** ✅ Connected`,
          ].join('\n'),
          inline: false,
        }
      )
      .setTimestamp()
      .setFooter({ text: '{{APP_TITLE}}' });

    await interaction.editReply({ embeds: [embed] });
  },
};

function formatUptime(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);

  return parts.join(' ');
}