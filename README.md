# 🌸 Nyaa.si Discord Bot

<div align="center">
  <img src="https://img.shields.io/badge/Discord-7289DA?style=for-the-badge&logo=discord&logoColor=white" alt="Discord">
  <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue.svg?style=for-the-badge" alt="Version">
</div>

<div align="center">
  <h3>🚀 Automated Discord notification bot for new torrents from nyaa.si</h3>
  <p>Stay updated with the latest anime releases directly in your Discord server!</p>
</div>

---

## ✨ Features

- 🔄 **Real-time Monitoring** - Automatically monitors nyaa.si RSS feed
- 📢 **Discord Notifications** - Sends beautiful embed notifications to your Discord channel
- 💾 **Smart Data Storage** - Efficient storage with Quick.DB
- 📊 **Detailed Information** - Shows seeders, leechers, category, and trustworthiness
- 🎨 **Beautiful Embeds** - Category-specific emojis and rich formatting
- 🎯 **Personal Subscriptions** - Get DM notifications for specific keywords
- 📈 **Live Statistics** - RSS-based top lists and trending torrents
- ⚡ **Manual Controls** - On-demand RSS checks and status monitoring
- 🛡️ **Trusted Torrents** - Special marking for verified uploads
- 🚫 **Anti-spam** - Built-in rate limiting and notification delays

## 🚀 Quick Start

### Prerequisites

- Node.js 16.0.0 or higher
- A Discord bot token
- A Discord server with admin permissions

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sw3do/nyaa-discord-bot.git
   cd nyaa-discord-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the bot**
   
   Create a `config.json` file in the root directory:
   ```json
   {
     "discordToken": "YOUR_DISCORD_BOT_TOKEN",
     "channelId": "YOUR_DISCORD_CHANNEL_ID",
     "checkInterval": 300000,
     "nyaaRssUrl": "https://nyaa.si/?page=rss",
     "maxStoredTorrents": 200,
     "notificationDelay": 2000,
     "maxTorrentsPerCheck": 15
   }
   ```

4. **Run the bot**
   ```bash
   npm start
   ```

## 🎮 Commands

### 📋 General Commands

| Command | Description |
|---------|-------------|
| `!nyaa-status` | 📊 Shows bot status and statistics |
| `!nyaa-check` | 🔄 Manually triggers RSS feed check |
| `!nyaa-help` | ❓ Shows help message |

### 🔔 Subscription System

| Command | Description |
|---------|-------------|
| `!nyaa-subscribe [keyword]` | ➕ Subscribe to keyword notifications |
| `!nyaa-unsubscribe [keyword]` | ➖ Unsubscribe from keyword notifications |
| `!nyaa-mylist` | 📝 Show your subscription list |

### 📈 Live Statistics

| Command | Description |
|---------|-------------|
| `!nyaa-top-today` | 🏆 Show today's most popular torrents |
| `!nyaa-top-week` | 📅 Show this week's most popular torrents |
| `!nyaa-most-seeded` | 🌱 Show most seeded torrents |

## ⚙️ Configuration

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `checkInterval` | `300000` | RSS feed check interval in milliseconds (5 minutes) |
| `nyaaRssUrl` | `https://nyaa.si/?page=rss` | Nyaa.si RSS feed URL |
| `maxStoredTorrents` | `200` | Maximum number of torrents to store in database |
| `notificationDelay` | `2000` | Delay between notifications to avoid rate limits |
| `maxTorrentsPerCheck` | `15` | Maximum torrents to check per RSS fetch |

### Setting up Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Copy the bot token and add it to your `config.json`
5. Enable necessary bot permissions:
   - Send Messages
   - Use Slash Commands
   - Embed Links
   - Read Message History

## 🎯 Advanced Features

### Personal Subscriptions
- Subscribe to specific keywords (anime names, fansub groups, etc.)
- Receive private DM notifications when matching torrents are found
- Support for up to 10 subscriptions per user
- Case-insensitive keyword matching
- Instant notifications without channel spam

### Live Statistics
- Real-time data directly from RSS feed
- No dependency on stored historical data
- Always up-to-date information
- Direct links to torrent pages
- Trending torrents and popularity metrics

### Smart Notifications
- ✅ Trusted torrents marked with verification badge
- 🎨 Category-specific emojis for visual identification
- 📊 Comprehensive torrent information display
- 🚫 Anti-spam protection with configurable delays
- 🔗 Direct download and details links

## 🛠️ Development

### Running in Development Mode
```bash
npm run dev
```

### Project Structure
```
nyaa-discord-bot/
├── index.js          # Main bot file
├── config.json       # Configuration file
├── package.json      # Dependencies and scripts
└── README.md         # Documentation
```

### Dependencies
- **discord.js** ^14.14.1 - Discord API wrapper
- **quick.db** ^9.1.6 - Simple database solution
- **node-fetch** ^2.6.7 - HTTP client for RSS fetching
- **xml2js** ^0.6.2 - XML parser for RSS feeds

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Contact the author: **sw3do**

## 🌟 Show your support

Give a ⭐️ if this project helped you!

---

<div align="center">
  <p>Made with ❤️ by <strong>sw3do</strong></p>
  <p>🌸 Happy torrenting! 🌸</p>
</div> 