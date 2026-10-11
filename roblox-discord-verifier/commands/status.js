const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check your BloxPass verification status'),
  
  async execute(interaction, db, client, BLOXLINK_API_KEY, BLOXLINK_API_BASE) {
    await interaction.deferReply({ ephemeral: true });
    
    const guildId = interaction.guild.id;
    
    // Check if BloxPass is configured and enabled for this guild
    const settings = db.prepare('SELECT enabled FROM guild_settings WHERE guild_id = ?').get(guildId);
    
    // Check if user is verified
    const row = db.prepare(
      'SELECT roblox_id, email, verified_at FROM verified WHERE discord_id = ?'
    ).get(interaction.user.id);
    
    // Create BloxPass branded embed
    const embed = new EmbedBuilder()
      .setTitle('🔐 BloxPass Status')
      .setColor('#1E3A8A')
      .setTimestamp();
    
    if (settings && !settings.enabled) {
      embed.setDescription('⚠️ **BloxPass verification is currently disabled for this server.**\n\nPlease contact an administrator if you need to verify.');
      embed.addFields({ name: 'Bot Status', value: '⚠️ Maintenance Mode', inline: true });
    } else if (!row) {
      embed.setDescription('Execute this command to view BloxPass status');
      embed.addFields(
        { name: 'Verification Status', value: '❌ Not Verified', inline: true },
        { name: 'Action Required', value: 'Use `/verify` to link your Roblox account', inline: false }
      );
    } else {
      const verifiedAt = new Date(row.verified_at);
      const formattedDate = verifiedAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      embed.setDescription('✅ **You are verified with BloxPass!**');
      embed.addFields(
        { name: 'Verification Status', value: '✅ Verified', inline: true },
        { name: 'Roblox ID', value: row.roblox_id, inline: true },
        { name: 'Email', value: row.email, inline: true },
        { name: 'Verified On', value: formattedDate, inline: false }
      );
    }
    
    await interaction.editReply({ embeds: [embed] });
  },
};
