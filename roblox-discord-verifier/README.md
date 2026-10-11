# BloxPass - Roblox-Discord Verification

![BloxPass Logo](https://via.placeholder.com/300x300/1E3A8A/FFFFFF?text=BloxPass) *Logo placeholder - replace with actual BloxPass logo*

**BloxPass** is a Discord bot that verifies users by linking their Roblox accounts using **Bloxlink API**. Perfect for gaming communities that want to ensure only legitimate Roblox players can access certain areas.

## ⭐ Features

- **BloxPass Branding** - Professional branding throughout
- **Easy Setup** - Interactive `/setup` command guides you through configuration
- **Bloxlink API Integration** - Simple Roblox verification without OAuth complexity
- **Multiple Commands** - `/verify`, `/unverify`, `/status`, `/setup`, `/help`
- **Role Configuration** - Set up Moderation, Administration, Unverified, and Verified roles
- **SQLite Database** - Persistent storage of verified users and server settings
- **Self-Hostable** - Deploy on any platform (no HTTPS required!)
- **Configurable** - Customize settings via config file
- **Role-Based Permissions** - Restrict commands to moderation/admin teams

## 📝 Commands

### User Commands

| Command | Description | Permission |
|---------|-------------|------------|
| `/verify` | Start verification to link your Roblox account | Anyone |
| `/unverify` | Remove your verification and verified role | Verified users |
| `/status` | Check your verification status | Anyone |
| `/help` | Show help information | Anyone |

### Admin Commands

| Command | Description | Permission |
|---------|-------------|------------|
| `/setup` | Configure BloxPass roles for your server | Administrator |

### 🎯 Setup Command Details

The `/setup` command provides an **interactive setup experience** with:

1. **Moderation Team Role** - Team members who can manage verifications
2. **Administration Team Role** - Team members who can change BloxPass settings
3. **Unverified Role** - (Optional) Role assigned to new members before verification
4. **Verified Role** - (Required) Role given after successful Roblox verification

**⚠️ Important:** The bot's role must be **placed ABOVE** the Verified Role in your Discord server's role hierarchy, or it won't be able to assign the role to users.

## Quick Start

### 1. Prerequisites

- Node.js 18+
- A Discord bot token
- A Bloxlink API key (optional - for Roblox verification)

### 2. Installation

```bash
# Clone or download this repository
git clone <repository-url>
cd roblox-discord-verifier

# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with your credentials

# Start the bot
npm start
```

### 3. Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# Discord Configuration
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_application_id
DISCORD_GUILD_ID=your_server_id
VERIFIED_ROLE_ID=your_verified_role_id

# Bloxlink API Configuration (Optional - for Roblox verification)
BLOXLINK_API_KEY=your_bloxlink_api_key_here

# Optional: Custom API endpoint
BLOXLINK_API_BASE=https://api.blox.link
```

**⚠️ IMPORTANT: Never share your .env file or commit it to version control!**

### 4. Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" tab and click "Add Bot"
4. Copy the **Bot Token** to `DISCORD_TOKEN`
5. Copy the **Application ID** to `DISCORD_CLIENT_ID`
6. Enable these permissions:
   - `Send Messages`
   - `Manage Roles`
   - `Read Message History`

### 5. Bloxlink API Setup (Optional)

If you want to use Bloxlink API for Roblox verification (recommended):

1. Get a Bloxlink API key from [Bloxlink](https://blox.link/)
2. Copy the **API Key** to `BLOXLINK_API_KEY`
3. (Optional) Set `BLOXLINK_API_BASE` if using a custom endpoint (default: `https://api.blox.link`)

### 💡 API Features

The bot includes **automatic handling** for:
- ✅ **Rate limits** - Automatic retries with exponential backoff
- ✅ **Network errors** - Retries on connection issues
- ✅ **User-friendly errors** - Clear messages for common issues (not linked, rate limited, etc.)
- ✅ **Custom endpoints** - Support for self-hosted Bloxlink instances

**Note:** Without Bloxlink API, the bot will still work but Roblox verification features will be limited.

### 6. Discord Server Setup

1. Invite the bot to your server:
   ```
   https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot+applications.commands&permissions=268435456
   ```
2. Create a role called "Verified" or any name you prefer
3. Copy the **Role ID** to `VERIFIED_ROLE_ID`
4. Place the bot's role **above** the verified role in the role hierarchy
5. Copy your **Server ID** to `DISCORD_GUILD_ID`

### 7. Hosting

The bot requires:
- **Node.js 18+** - Runtime environment
- **Persistent hosting** - The bot needs to run 24/7
- **Internet connection** - To communicate with Discord and Bloxlink APIs

#### Recommended Hosting Options:

- **Replit** (with Always-On feature)
- **Railway.app**
- **Render.com**
- **Heroku**
- **VPS** (DigitalOcean, Linode, AWS, etc.)
- **Your own computer** (for testing)

#### Using Replit:

1. Upload all files to Replit
2. Install dependencies: `npm install`
3. Set environment variables in Replit's Secrets
4. Run: `npm start`

**Note:** No HTTPS or public domain required! The bot uses Discord's slash commands and Bloxlink API directly.

### 8. Running the Bot

```bash
# Start the bot
npm start

# Or with custom port
PORT=8080 npm start
```

The bot will:
- Create the SQLite database automatically
- Register slash commands with Discord
- Start the web server
- Log in and be ready for verification

### 9. Configure BloxPass in Your Server

After the bot is running, **run `/setup` in your Discord server** to configure BloxPass:

The interactive setup will guide you through:
1. **Moderation Team Role** - Team members who can manage verifications
2. **Administration Team Role** - Team members who can change BloxPass settings
3. **Unverified Role** - (Optional) Role for new members before verification
4. **Verified Role** - (Required) Role given after successful Roblox verification

⚠️ **CRITICAL:** Go to your Discord server settings and **place the bot's role ABOVE the Verified role** in the role hierarchy. Otherwise, the bot cannot assign the verified role to users.

### 10. Test It Out

Have a test user run the `/verify` command. They should:
1. Receive a verification link
2. Click the link and authenticate with Roblox
3. Get redirected back to Discord
4. Automatically receive the Verified role

They can check their status with `/status`

## Configuration

You can customize the bot's behavior by editing `config/default.json`:

```json
{
  "discord": {
    "prefix": "/",
    "activity": "Verifying users",
    "status": "online"
  },
  "verification": {
    "stateExpiryMinutes": 10,
    "requireEmailVerified": true,
    "allowedDomains": ["gmail.com", "outlook.com"]
  },
  "web": {
    "port": 3000,
    "host": "0.0.0.0"
  }
}
```

**Options:**
- `stateExpiryMinutes`: How long verification links are valid (default: 10)
- `requireEmailVerified`: Only allow users with verified Roblox emails (default: true)
- `allowedDomains`: Restrict to specific email domains (empty array = allow all)
- `activity`: Bot's "Playing" status
- `status`: Online status (online, idle, dnd, invisible)

## Project Structure

```
roblox-discord-verifier/
├── bot.js                  # Main bot entry point
├── commands/               # Slash command files
│   ├── verify.js           # Start verification command
│   ├── unverify.js         # Remove verification command
│   ├── status.js           # Check verification status
│   └── help.js             # Help command
├── config/
│   └── default.json        # Bot configuration
├── utils/
│   └── logger.js           # Logging utilities
├── .env                    # Environment variables (DO NOT COMMIT)
├── .gitignore              # Git ignore rules
├── package.json            # Node.js dependencies
└── README.md               # This file
```

## Database

The bot uses SQLite for storage:
- `verification.sqlite` - Main database file
- `verification.sqlite-wal` - Write-ahead log
- `verification.sqlite-shm` - Shared memory

**Tables:**
- `pending` - Stores active verification states
- `verified` - Stores verified user data
- `guild_settings` - Per-guild configuration

## Troubleshooting

### Common Issues

**1. Bot doesn't respond to commands**
- Ensure the bot has the correct permissions
- Check that slash commands were registered
- Verify the bot is logged in (check console)

**2. Verification link doesn't work**
- Ensure `ROBLOX_REDIRECT_URI` matches exactly what's registered in Roblox
- Verify HTTPS is being used
- Check that the domain is accessible

**3. Role not assigned**
- Ensure the bot's role is **above** the verified role
- Check that `VERIFIED_ROLE_ID` is correct
- Verify the bot has "Manage Roles" permission

**4. Error: "Missing environment variable"**
- Ensure all required variables are in `.env`
- Check for typos in variable names
- Restart the bot after making changes

### Debugging

Enable verbose logging:
```bash
DEBUG=* npm start
```

Check the database:
```bash
sqlite3 verification.sqlite "SELECT * FROM verified;"
```

## Security Best Practices

1. **Never share your .env file** - It contains sensitive tokens
2. **Use HTTPS** - Required for Roblox OAuth
3. **Rate limit your endpoints** - Prevent abuse
4. **Keep dependencies updated** - `npm update` regularly
5. **Rotate tokens** - If you suspect a leak, generate new ones
6. **Restrict bot permissions** - Only give what's necessary
7. **Use .gitignore** - Exclude `.env` and database files

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - Feel free to use, modify, and distribute.

---

**Need help?** Check the [Discord.js Guide](https://discordjs.guide/) or [Roblox OAuth Docs](https://oauth.roblox.com/docs)

*Made with ❤️ for the Roblox and Discord communities*
