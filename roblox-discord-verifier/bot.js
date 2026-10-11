require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('node:crypto');
const Database = require('better-sqlite3');
const {
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
  Collection,
  EmbedBuilder,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

// Validate required environment variables
const required = [
  'DISCORD_TOKEN',
  'DISCORD_CLIENT_ID',
];

for (const name of required) {
  if (!process.env[name]) {
    console.error(`❌ Missing environment variable: ${name}`);
    process.exit(1);
  }
}

// Optional environment variables
const BLOXLINK_API_KEY = process.env.BLOXLINK_API_KEY;
const BLOXLINK_API_BASE = process.env.BLOXLINK_API_BASE || 'https://api.blox.link';

// Log warnings for missing optional variables
if (!BLOXLINK_API_KEY) {
  console.warn('⚠️ BLOXLINK_API_KEY not set. Roblox verification will not work.');
  console.warn('💡 Get a key from: https://blox.link/');
} else {
  console.log(`✅ Bloxlink API configured. Using endpoint: ${BLOXLINK_API_BASE}`);
}

// Set up database
const db = new Database('verification.sqlite');
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS pending (
    state TEXT PRIMARY KEY,
    discord_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    guild_id TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS verified (
    discord_id TEXT PRIMARY KEY,
    roblox_id TEXT NOT NULL UNIQUE,
    roblox_username TEXT,
    email TEXT,
    verified_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS guild_settings (
    guild_id TEXT PRIMARY KEY,
    moderation_role_id TEXT,
    admin_role_id TEXT,
    unverified_role_id TEXT,
    verified_role_id TEXT NOT NULL,
    log_channel_id TEXT,
    enabled INTEGER DEFAULT 1
  );
`);

// Set up Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

// Store temporary setup data
const setupData = new Map();

// Load commands
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

client.commands = new Collection();

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.warn(`⚠️ The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// Bot ready event
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Logged in as ${c.user.tag} (ID: ${c.user.id})`);
  
  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    // Register global commands (for public bot)
    const commandsToRegister = [];
    client.commands.forEach(cmd => commandsToRegister.push(cmd.data.toJSON()));
    
    await rest.put(
      Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
      { body: commandsToRegister }
    );
    
    console.log(`✅ Registered ${commandsToRegister.length} global application commands`);
    
    // Set bot presence
    await client.user.setActivity('Verifying with Bloxlink', { type: 0 });
    await client.user.setStatus('online');
    
    console.log(`🔐 BloxPass bot is ready!`);
    console.log(`💡 Using Bloxlink API for Roblox verification`);
    console.log(`📊 Features: Automatic rate limit handling, retry logic, custom API endpoints`);
  } catch (err) {
    console.error('❌ Error registering commands:', err.message);
    process.exit(1);
  }
});

// Interaction handler
client.on(Events.InteractionCreate, async (interaction) => {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    
    if (!command) {
      console.error(`❌ No command matching ${interaction.commandName} was found.`);
      return;
    }
    
    try {
      await command.execute(interaction, db, client, BLOXLINK_API_KEY, BLOXLINK_API_BASE);
    } catch (error) {
      console.error(`❌ Error executing ${interaction.commandName}:`, error.message);
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: '❌ There was an error while executing this command.',
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: '❌ There was an error while executing this command.',
          ephemeral: true,
        });
      }
    }
    return;
  }
  }
  
  // Handle button interactions
  if (interaction.isButton()) {
    const guildId = interaction.guild.id;
    
    if (interaction.customId === 'bloxpass_complete_setup') {
      const data = setupData.get(guildId);
      
      if (!data) {
        return await interaction.reply({
          content: '❌ Setup session expired. Please run /setup again.',
          ephemeral: true,
        });
      }
      
      if (!data.verified_role) {
        return await interaction.reply({
          content: '❌ Please select a Verified Role before completing setup.',
          ephemeral: true,
        });
      }
      
      try {
        db.prepare(`
          INSERT OR REPLACE INTO guild_settings 
          (guild_id, moderation_role_id, admin_role_id, unverified_role_id, verified_role_id, enabled)
          VALUES (?, ?, ?, ?, ?, 1)
        `).run(
          guildId,
          data.moderation_role || null,
          data.admin_role || null,
          data.unverified_role || null,
          data.verified_role
        );
        
        await interaction.reply({
          content: `✅ **BloxPass Setup Complete!**\n\n` +
            `📋 **Configuration Saved:**\n` +
            (data.moderation_role ? `• Moderation Role: <@&${data.moderation_role}>\n` : '') +
            (data.admin_role ? `• Admin Role: <@&${data.admin_role}>\n` : '') +
            (data.unverified_role ? `• Unverified Role: <@&${data.unverified_role}>\n` : '') +
            `• Verified Role: <@&${data.verified_role}>\n\n` +
            `💡 **Next Steps:**\n` +
            `1. Place my role **above** the Verified role in your server settings\n` +
            `2. Use the buttons below to enable/disable BloxPass\n` +
            `3. Users can now use /verify to authenticate with Bloxlink`,
          components: [
            new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId('bloxpass_enable')
                  .setLabel('Enable BloxPass')
                  .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                  .setCustomId('bloxpass_disable')
                  .setLabel('Disable BloxPass')
                  .setStyle(ButtonStyle.Danger)
              )
          ],
          ephemeral: true,
        });
        
        setupData.delete(guildId);
      } catch (error) {
        console.error('Error saving guild settings:', error);
        await interaction.reply({
          content: '❌ Failed to save settings. Please try again.',
          ephemeral: true,
        });
      }
    }
    
    if (interaction.customId === 'bloxpass_reconfigure') {
      db.prepare('DELETE FROM guild_settings WHERE guild_id = ?').run(guildId);
      setupData.delete(guildId);
      
      await interaction.reply({
        content: '🔄 Please run `/setup` again to reconfigure BloxPass.',
        ephemeral: true,
      });
    }
    
    if (interaction.customId === 'bloxpass_view_config') {
      const settings = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
      
      if (!settings) {
        return await interaction.reply({
          content: '❌ No configuration found. Please run `/setup` first.',
          ephemeral: true,
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
        .setFooter({ text: 'Use /setup to reconfigure' })
        .setTimestamp();
      
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    if (interaction.customId === 'bloxpass_enable') {
      const result = db.prepare(
        'UPDATE guild_settings SET enabled = 1 WHERE guild_id = ?'
      ).run(guildId);
      
      if (result.changes === 0) {
        db.prepare(`
          INSERT INTO guild_settings 
          (guild_id, enabled)
          VALUES (?, 1)
        `).run(guildId);
      }
      
      await interaction.reply({
        content: '✅ **BloxPass verification is now enabled for this server.**',
        ephemeral: true,
      });
    }
    
    if (interaction.customId === 'bloxpass_disable') {
      const result = db.prepare(
        'UPDATE guild_settings SET enabled = 0 WHERE guild_id = ?'
      ).run(guildId);
      
      if (result.changes === 0) {
        return await interaction.reply({
          content: '⚠️ **BloxPass is not configured yet.** Use `/setup` first.',
          ephemeral: true,
        });
      }
      
      await interaction.reply({
        content: '✅ **BloxPass verification is now disabled for this server.**\n\nUsers can still use /status and /unverify, but /verify will not work.',
        ephemeral: true,
      });
    }
    
    return;
  }
  
  // Handle role select menu interactions for setup
  if (interaction.isRoleSelectMenu()) {
    const guildId = interaction.guild.id;
    
    if (!setupData.has(guildId)) {
      setupData.set(guildId, {
        moderation_role: null,
        admin_role: null,
        unverified_role: null,
        verified_role: null,
      });
    }
    
    const data = setupData.get(guildId);
    
    if (interaction.customId === 'bloxpass_moderation_role') {
      data.moderation_role = interaction.values[0];
    } else if (interaction.customId === 'bloxpass_admin_role') {
      data.admin_role = interaction.values[0];
    } else if (interaction.customId === 'bloxpass_unverified_role') {
      data.unverified_role = interaction.values[0];
    } else if (interaction.customId === 'bloxpass_verified_role') {
      data.verified_role = interaction.values[0];
    }
    
    setupData.set(guildId, data);
    
    await interaction.reply({
      content: `✅ Selected: ${interaction.values.length > 0 ? `<@&${interaction.values[0]}>` : 'None'}`,
      ephemeral: true,
    });
    
    return;
  }
});

// Error handling
client.on(Events.Error, (error) => {
  console.error('❌ Discord client error:', error.message);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error.message);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

// Start the bot
console.log('🚀 Starting BloxPass bot with Bloxlink integration...');
client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error('❌ Failed to login:', err.message);
  process.exit(1);
});
