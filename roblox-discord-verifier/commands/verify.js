const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify your Roblox account using Bloxlink API'),
  
  async execute(interaction, db, client, BLOXLINK_API_KEY, BLOXLINK_API_BASE) {
    await interaction.deferReply({ ephemeral: true });
    
    const guildId = interaction.guild.id;
    const discordId = interaction.user.id;
    const member = interaction.member;
    
    // Check if guild has settings configured
    const settings = db.prepare('SELECT moderation_role_id, admin_role_id, enabled, verified_role_id FROM guild_settings WHERE guild_id = ?').get(guildId);
    
    // If settings exist, check if user has required roles
    if (settings) {
      // Check if BloxPass is enabled
      if (!settings.enabled) {
        return await interaction.editReply({
          content: '❌ **BloxPass verification is currently disabled for this server.**\n\nPlease contact an administrator.'
        });
      }
      
      // Check if moderation or admin roles are configured
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
    } else {
      return await interaction.editReply({
        content: '❌ **BloxPass is not configured for this server.**\n\nPlease have an administrator run `/setup` first.'
      });
    }
    
    // Check if user is already verified
    const existingVerification = db.prepare(
      'SELECT roblox_id, roblox_username FROM verified WHERE discord_id = ?'
    ).get(discordId);
    
    if (existingVerification) {
      return await interaction.editReply({
        content: `✅ **You are already verified with BloxPass!**\n\n` +
          `🆔 Roblox ID: ${existingVerification.roblox_id}\n` +
          `👤 Username: ${existingVerification.roblox_username || 'N/A'}\n\n` +
          `Use /status to view your verification details.`
      });
    }
    
    await interaction.editReply({
      content: '⏳ **Verifying your Roblox account with Bloxlink...**\n\nPlease wait while we check your account.'
    });
    
    try {
      // Call Bloxlink API to verify the user
      const bloxlinkResponse = await verifyWithBloxlink(guildId, discordId, BLOXLINK_API_KEY, BLOXLINK_API_BASE);
      
      if (!bloxlinkResponse.success) {
        // Handle specific error cases
        if (bloxlinkResponse.errorCode === 'RATE_LIMITED') {
          return await interaction.editReply({
            content: `⚠️ **Rate limited by Bloxlink API.**\n\n` +
              `Please try again in a few minutes.`
          });
        }
        
        if (bloxlinkResponse.errorCode === 'NOT_LINKED') {
          return await interaction.editReply({
            content: `❌ **Discord account not linked to Roblox.**\n\n` +
              `You must first link your Discord and Roblox accounts at:\n` +
              `https://blox.link/`
          });
        }
        
        return await interaction.editReply({
          content: `❌ **Verification failed:** ${bloxlinkResponse.message || 'User not found in Bloxlink'}`
        });
      }
      
      // Save verification to database
      db.prepare(`
        INSERT INTO verified (discord_id, roblox_id, roblox_username, verified_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(discord_id) DO UPDATE SET
          roblox_id = excluded.roblox_id,
          roblox_username = excluded.roblox_username,
          verified_at = excluded.verified_at
      `).run(
        discordId,
        bloxlinkResponse.robloxId,
        bloxlinkResponse.username,
        Date.now()
      );
      
      // Get guild settings and assign role
      const guildSettings = db.prepare(
        'SELECT verified_role_id, unverified_role_id FROM guild_settings WHERE guild_id = ?'
      ).get(guildId);
      
      const guild = await client.guilds.fetch(guildId);
      const userMember = await guild.members.fetch(discordId);
      
      const roleIdToAdd = guildSettings?.verified_role_id || null;
      
      if (roleIdToAdd) {
        await userMember.roles.add(roleIdToAdd);
        
        // Remove unverified role if configured
        if (guildSettings?.unverified_role_id) {
          await userMember.roles.remove(guildSettings.unverified_role_id).catch(() => {});
        }
      }
      
      await interaction.editReply({
        content: `✅ **BloxPass Verification Complete!**\n\n` +
          `🆔 Roblox ID: ${bloxlinkResponse.robloxId}\n` +
          `👤 Username: ${bloxlinkResponse.username}\n\n` +
          `You have been assigned the verified role!`
      });
    } catch (error) {
      console.error('Bloxlink verification error:', error.message);
      
      // Handle network errors
      if (error.message.includes('ENOTFOUND') || error.message.includes('EAI_AGAIN')) {
        await interaction.editReply({
          content: '❌ **Connection error.** Unable to reach Bloxlink API. Please try again later.'
        });
      } else if (error.message.includes('ETIMEDOUT')) {
        await interaction.editReply({
          content: '❌ **Request timeout.** Bloxlink API is taking too long to respond. Please try again.'
        });
      } else {
        await interaction.editReply({
          content: '❌ **Verification failed.** Please try again or contact an administrator.'
        });
      }
    }
  },
};

// Bloxlink API verification function
// Uses: https://api.blox.link/v4/public/guilds/{guild_id}/discord-to-roblox/{discord_id}
async function verifyWithBloxlink(guildId, discordId, apiKey, apiBase) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 2000;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (!apiKey) {
        throw new Error('BLOXLINK_API_KEY not configured');
      }
      
      const url = `${apiBase}/v4/public/guilds/${guildId}/discord-to-roblox/${discordId}`;
      
      const response = await fetch(url, {
        headers: { 
          "Authorization": `key ${apiKey}` 
        }
      });
      
      // Handle rate limiting (HTTP 429)
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after') || RETRY_DELAY_MS / 1000;
        const delay = Math.min(retryAfter * 1000, RETRY_DELAY_MS * attempt);
        
        if (attempt < MAX_RETRIES) {
          console.warn(`Rate limited. Retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return { 
          success: false, 
          message: 'Bloxlink API rate limit exceeded. Please try again later.',
          errorCode: 'RATE_LIMITED'
        };
      }
      
      // Handle not found (HTTP 404)
      if (response.status === 404) {
        return { 
          success: false, 
          message: 'Your Discord account is not linked to a Roblox account on Bloxlink.',
          errorCode: 'NOT_LINKED'
        };
      }
      
      // Handle unauthorized (HTTP 401)
      if (response.status === 401) {
        return { 
          success: false, 
          message: 'Invalid Bloxlink API key. Please check your configuration.',
          errorCode: 'INVALID_API_KEY'
        };
      }
      
      // Handle server errors (HTTP 5xx)
      if (response.status >= 500) {
        if (attempt < MAX_RETRIES) {
          console.warn(`Bloxlink API error ${response.status}. Retrying in ${RETRY_DELAY_MS}ms (attempt ${attempt}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }
        
        return { 
          success: false, 
          message: 'Bloxlink API is currently unavailable. Please try again later.',
          errorCode: 'API_UNAVAILABLE'
        };
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}`;
        
        return { 
          success: false, 
          message: errorMessage || 'Failed to verify with Bloxlink API',
          errorCode: 'API_ERROR'
        };
      }
      
      const data = await response.json();
      
      // Extract Roblox ID from the response
      const robloxId = data.robloxId || data.id || data.userId;
      const username = data.robloxUsername || data.username || data.name;
      
      if (!robloxId) {
        return { 
          success: false, 
          message: 'No Roblox account linked to this Discord user in Bloxlink',
          errorCode: 'NOT_LINKED'
        };
      }
      
      return { 
        success: true, 
        robloxId: robloxId.toString(),
        username: username || 'Unknown',
        message: 'Verification successful'
      };
    } catch (error) {
      console.error(`Bloxlink API attempt ${attempt} failed:`, error.message);
      
      // Retry on network errors
      if (attempt < MAX_RETRIES && 
          (error.message.includes('ENOTFOUND') || 
           error.message.includes('EAI_AGAIN') ||
           error.message.includes('ETIMEDOUT'))) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        continue;
      }
      
      // Don't retry for other errors
      return {
        success: false,
        message: error.message || 'Failed to connect to Bloxlink API',
        errorCode: 'CONNECTION_ERROR'
      };
    }
  }
  
  // All retries failed
  return {
    success: false,
    message: 'Failed to verify with Bloxlink after multiple attempts.',
    errorCode: 'MAX_RETRIES_EXCEEDED'
  };
}
