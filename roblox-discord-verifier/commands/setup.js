const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, RoleSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure BloxPass verification for your server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),
  
  async execute(interaction, db, client, BLOXLINK_API_KEY, BLOXLINK_API_BASE) {
    await interaction.deferReply({ ephemeral: true });
    
    const guildId = interaction.guild.id;
    
    // Check if already configured
    const existingConfig = db.prepare(
      'SELECT * FROM guild_settings WHERE guild_id = ?'
    ).get(guildId);
    
    if (existingConfig) {
      return await interaction.editReply({
        content: `✅ **BloxPass is already configured for this server!**\n\n` +
          `To reconfigure, use the buttons below.`,
        components: [
          new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId('bloxpass_reconfigure')
                .setLabel('Reconfigure BloxPass')
                .setStyle(ButtonStyle.Danger),
              new ButtonBuilder()
                .setCustomId('bloxpass_view_config')
                .setLabel('View Current Settings')
                .setStyle(ButtonStyle.Secondary)
            )
        ]
      });
    }
    
    // Create setup message with role selectors
    await interaction.editReply({
      content: `🚀 **Welcome to BloxPass Setup!**\n\n` +
        `Please configure the roles for your verification system.\n\n` +
        `📋 **Instructions:**\n` +
        `Select the appropriate roles from the menus below:\n` +
        `1. **Moderation Team** - Who can manage verifications\n` +
        `2. **Administration Team** - Who can change settings\n` +
        `3. **Unverified Role** - Assigned to new members\n` +
        `4. **Verified Role** - Given after Roblox verification\n\n` +
        `⚠️ **Important:** Place my role **above** the Verified role in your role hierarchy.`,
      components: [
        new ActionRowBuilder()
          .addComponents(
            new RoleSelectMenuBuilder()
              .setCustomId('bloxpass_moderation_role')
              .setPlaceholder('Select Moderation Team Role')
              .setMinValues(0)
              .setMaxValues(1)
          ),
        new ActionRowBuilder()
          .addComponents(
            new RoleSelectMenuBuilder()
              .setCustomId('bloxpass_admin_role')
              .setPlaceholder('Select Administration Team Role')
              .setMinValues(0)
              .setMaxValues(1)
          ),
        new ActionRowBuilder()
          .addComponents(
            new RoleSelectMenuBuilder()
              .setCustomId('bloxpass_unverified_role')
              .setPlaceholder('Select Unverified Role (Optional)')
              .setMinValues(0)
              .setMaxValues(1)
          ),
        new ActionRowBuilder()
          .addComponents(
            new RoleSelectMenuBuilder()
              .setCustomId('bloxpass_verified_role')
              .setPlaceholder('Select Verified Role')
              .setMinValues(1)
              .setMaxValues(1)
          ),
        new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('bloxpass_complete_setup')
              .setLabel('Complete Setup')
              .setStyle(ButtonStyle.Success)
              .setDisabled(false)
          )
      ]
    });
  },
};
