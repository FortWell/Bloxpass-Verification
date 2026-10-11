const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('View BloxPass configuration for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current BloxPass configuration')
    ),
  
  async execute(interaction, db, client, BLOXLINK_API_KEY, BLOXLINK_API_BASE) {
    await interaction.deferReply({ ephemeral: true });
    
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    
    if (subcommand === 'view') {
      const settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
      
      if (!settings) {
        return await interaction.editReply({
          content: '❌ **BloxPass is not configured for this server.**\n\nRun `/setup` to configure it!'
        });
      }
      
      const embed = new EmbedBuilder()
        .setTitle('🔐 BloxPass Configuration')
        .setColor('#1E3A8A')
        .setDescription(`Current settings for **${interaction.guild.name}**`)
        .addFields(
          { name: 'Status', value: settings.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Verified Role', value: settings.verified_role_id ? `<@&${settings.verified_role_id}>` : 'Not set', inline: true },
          { name: 'Unverified Role', value: settings.unverified_role_id ? `<@&${settings.unverified_role_id}>` : 'Not set', inline: true },
          { name: 'Moderation Role', value: settings.moderation_role_id ? `<@&${settings.moderation_role_id}>` : 'Not set', inline: true },
          { name: 'Admin Role', value: settings.admin_role_id ? `<@&${settings.admin_role_id}>` : 'Not set', inline: true },
        )
        .setFooter({ text: 'Use /setup to reconfigure or change status' })
        .setTimestamp();
      
      if (settings.log_channel_id) {
        embed.addFields({ name: 'Log Channel', value: `<#${settings.log_channel_id}>`, inline: true });
      }
      
      await interaction.editReply({ embeds: [embed] });
    }
  },
};
