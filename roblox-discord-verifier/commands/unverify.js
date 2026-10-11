const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unverify')
    .setDescription('Remove your Roblox verification and verified role'),
  
  async execute(interaction, db, client, BLOXLINK_API_KEY, BLOXLINK_API_BASE) {
    await interaction.deferReply({ ephemeral: true });
    
    const guildId = interaction.guild.id;
    const member = interaction.member;
    
    // Check if guild has settings configured
    const settings = db.prepare('SELECT moderation_role_id, admin_role_id FROM guild_settings WHERE guild_id = ?').get(guildId);
    
    // If settings exist, check if user has required roles
    if (settings) {
      const requiredRoles = [];
      if (settings.moderation_role_id) requiredRoles.push(settings.moderation_role_id);
      if (settings.admin_role_id) requiredRoles.push(settings.admin_role_id);
      
      // If roles are configured, check if user has at least one
      if (requiredRoles.length > 0) {
        const hasRole = requiredRoles.some(roleId => member.roles.cache.has(roleId));
        
        if (!hasRole) {
          return await interaction.editReply({
            content: '❌ **You do not have permission to use this command.**\n\n' +
              'This command is restricted to Moderation and Administration team members.'
          });
        }
      }
    }
    
    // Remove from verified database
    const removeResult = db.prepare('DELETE FROM verified WHERE discord_id = ?').run(interaction.user.id);
    
    if (removeResult.changes === 0) {
      return await interaction.editReply({
        content: '❌ You are not currently verified with BloxPass.'
      });
    }
    
    // Remove role from user
    try {
      const guild = await interaction.guild.fetch();
      const userMember = await guild.members.fetch(interaction.user.id);
      
      // Get guild-specific verified role
      const guildSettings = db.prepare('SELECT verified_role_id, unverified_role_id FROM guild_settings WHERE guild_id = ?').get(guildId);
      const roleIdToRemove = guildSettings?.verified_role_id || process.env.VERIFIED_ROLE_ID;
      
      if (roleIdToRemove) {
        await userMember.roles.remove(roleIdToRemove);
      }
      
      // Add unverified role if configured
      if (guildSettings?.unverified_role_id) {
        await userMember.roles.add(guildSettings.unverified_role_id);
      }
      
      await interaction.editReply({
        content: '✅ **Your BloxPass verification has been removed.**\n\nThe verified role has been taken away.'
      });
    } catch (error) {
      console.error('Error removing role:', error);
      await interaction.editReply({
        content: '✅ **Your BloxPass verification data has been removed**, but there was an error updating your roles. Please contact an administrator.'
      });
    }
  },
};
