const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show information about BloxPass verification commands'),
  
  async execute(interaction, db, client, BLOXLINK_API_KEY, BLOXLINK_API_BASE) {
    await interaction.reply({
      content: `
🔐 **BloxPass - Roblox-Discord Verification**\n\n` +
        `✨ **Available Commands:**\n\n` +
        `👤 User Commands:\n` +
        `• "/verify" - Verify your Roblox account using Bloxlink API\n` +
        `• "/unverify" - Remove your verification and verified role\n` +
        `• "/status" - Check your BloxPass verification status\n` +
        `• "/help" - Show this help message\n\n` +
        `⚙️ Admin Commands:\n` +
        `• "/setup" - Interactive setup to configure BloxPass roles (Administrator only)\n` +
        `• "/config view" - View current BloxPass configuration\n\n` +
        `📋 **How BloxPass Works:**\n` +
        `1. Server admin runs /setup to configure roles\n` +
        `2. Users run /verify to verify via Bloxlink API\n` +
        `3. Bot checks with Bloxlink if Discord and Roblox are linked\n` +
        `4. Get the verified role!\n\n` +
        `⏳ **Important Notes:**\n` +
        `• Users must link their Discord and Roblox on blox.link first\n` +
        `• Bot role must be ABOVE the verified role\n` +
        `• ONE Bloxlink API key works for ALL servers`,
      ephemeral: true,
    });
  },
};
