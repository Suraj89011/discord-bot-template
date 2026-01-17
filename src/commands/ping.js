/**
 * Ping command - check bot latency
 */
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency and response time'),
  cooldown: 5,
  async execute(interaction) {
    const sent = await interaction.reply({
      content: 'Pinging...',
      fetchReply: true,
    });

    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    const embed = new EmbedBuilder()
      .setColor(latency < 200 ? 0x00ff00 : latency < 500 ? 0xffff00 : 0xff0000)
      .setTitle('🏓 Pong!')
      .addFields(
        { name: 'Bot Latency', value: `${latency}ms`, inline: true },
        { name: 'API Latency', value: `${apiLatency}ms`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ content: null, embeds: [embed] });
  },
};