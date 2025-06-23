/**
 * Nyaa.si Discord Notification Bot
 * Monitors nyaa.si RSS feed and sends notifications to Discord
 * @author sw3do
 * @version 1.0.0
 */

const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { QuickDB } = require('quick.db');
const fetch = require('node-fetch');
const xml2js = require('xml2js');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
const db = new QuickDB();

/**
 * Discord client instance with required intents
 */
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

/**
 * Bot ready event handler
 * Starts the RSS feed monitoring process
 */
client.once('ready', () => {
    console.log(`Bot is ready! Logged in as ${client.user.tag}.`);
    checkNyaaFeed();
    setInterval(checkNyaaFeed, config.checkInterval);
});

/**
 * Main function to check nyaa.si RSS feed for new torrents
 * Processes new torrents and sends notifications
 * @async
 * @function checkNyaaFeed
 */
async function checkNyaaFeed() {
    try {
        console.log('Checking nyaa.si RSS feed...');
        
        const response = await fetch(config.nyaaRssUrl);
        const xmlData = await response.text();
        
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlData);
        
        const items = result.rss.channel[0].item;
        
        if (!items) {
            console.log('No items found in RSS feed');
            return;
        }

        const lastCheckedTorrents = await db.get('lastCheckedTorrents') || [];
        const newTorrents = [];

        for (const item of items.slice(0, 15)) {
            const torrentId = item.guid[0]._;
            const title = item.title[0];
            const downloadLink = item.link[0];
            const viewLink = item.guid[0]._;
            const pubDate = new Date(item.pubDate[0]);
            
            const category = item['nyaa:category'] ? item['nyaa:category'][0] : 'Unknown';
            const size = item['nyaa:size'] ? item['nyaa:size'][0] : 'Unknown';
            const seeders = parseInt(item['nyaa:seeders'] ? item['nyaa:seeders'][0] : '0');
            const leechers = parseInt(item['nyaa:leechers'] ? item['nyaa:leechers'][0] : '0');
            const downloads = parseInt(item['nyaa:downloads'] ? item['nyaa:downloads'][0] : '0');
            const trusted = item['nyaa:trusted'] ? item['nyaa:trusted'][0] : 'No';
            const infoHash = item['nyaa:infoHash'] ? item['nyaa:infoHash'][0] : '';

            if (!lastCheckedTorrents.includes(torrentId)) {
                const torrentData = {
                    id: torrentId,
                    title: title,
                    downloadLink: downloadLink,
                    viewLink: viewLink,
                    pubDate: pubDate,
                    category: category,
                    size: size,
                    seeders: seeders,
                    leechers: leechers,
                    downloads: downloads,
                    trusted: trusted,
                    infoHash: infoHash
                };

                newTorrents.push(torrentData);
            }
        }

        if (newTorrents.length > 0) {
            console.log(`${newTorrents.length} new torrents found!`);
            
            for (const torrent of newTorrents) {
                await sendDiscordNotification(torrent);
                await checkUserSubscriptions(torrent);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            const updatedTorrents = [...lastCheckedTorrents, ...newTorrents.map(t => t.id)];
            if (updatedTorrents.length > 200) {
                updatedTorrents.splice(0, updatedTorrents.length - 200);
            }
            
            await db.set('lastCheckedTorrents', updatedTorrents);
        } else {
            console.log('No new torrents found');
        }

    } catch (error) {
        console.error('RSS feed check error:', error);
    }
}

/**
 * Checks user subscriptions against new torrent
 * Sends personal DM notifications if keywords match
 * @async
 * @function checkUserSubscriptions
 * @param {Object} torrent - Torrent data object
 */
async function checkUserSubscriptions(torrent) {
    try {
        const allUsers = await db.get('userSubscriptions') || {};
        
        for (const userId in allUsers) {
            const userSubscriptions = allUsers[userId] || [];
            
            for (const keyword of userSubscriptions) {
                if (torrent.title.toLowerCase().includes(keyword.toLowerCase())) {
                    await sendPersonalNotification(userId, torrent, keyword);
                }
            }
        }
    } catch (error) {
        console.error('User subscription check error:', error);
    }
}

/**
 * Sends personal DM notification to subscribed user
 * @async
 * @function sendPersonalNotification
 * @param {string} userId - Discord user ID
 * @param {Object} torrent - Torrent data object
 * @param {string} keyword - Matched keyword
 */
async function sendPersonalNotification(userId, torrent, keyword) {
    try {
        const user = await client.users.fetch(userId);
        
        const embed = new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle('🔔 Subscription Notification')
            .setDescription(`New torrent for keyword: **${keyword}**`)
            .addFields(
                { name: '📝 Title', value: torrent.title, inline: false },
                { name: '📁 Category', value: torrent.category, inline: true },
                { name: '📏 Size', value: torrent.size, inline: true },
                { name: '📊 Stats', value: `🌱 ${torrent.seeders} | 📥 ${torrent.leechers}`, inline: true },
                { name: '🔗 Links', value: `[Download](${torrent.downloadLink}) | [Details](${torrent.viewLink})` }
            )
            .setTimestamp()
            .setFooter({ text: `Keyword: ${keyword}` });

        await user.send({ embeds: [embed] });
        console.log(`Personal notification sent: ${userId} - ${keyword}`);

    } catch (error) {
        console.error(`Personal notification error (${userId}):`, error);
    }
}

/**
 * Sends Discord notification to main channel for new torrent
 * @async
 * @function sendDiscordNotification
 * @param {Object} torrent - Torrent data object
 */
async function sendDiscordNotification(torrent) {
    try {
        const channel = client.channels.cache.get(config.channelId);
        
        if (!channel) {
            console.error('Discord channel not found!');
            return;
        }

        const trustedEmoji = torrent.trusted === 'Yes' ? '✅' : '⚠️';
        const categoryEmoji = getCategoryEmoji(torrent.category);

        const embed = new EmbedBuilder()
            .setColor(torrent.trusted === 'Yes' ? '#00ff00' : '#ff9900')
            .setTitle(`${trustedEmoji} New Torrent`)
            .setURL(torrent.viewLink)
            .setDescription(`**${torrent.title}**`)
            .addFields(
                { 
                    name: `${categoryEmoji} Category`, 
                    value: torrent.category, 
                    inline: true 
                },
                { 
                    name: '📏 Size', 
                    value: torrent.size, 
                    inline: true 
                },
                { 
                    name: '📅 Date', 
                    value: torrent.pubDate.toLocaleString('en-US'), 
                    inline: true 
                },
                { 
                    name: '📊 Statistics', 
                    value: `🌱 ${torrent.seeders} | 📥 ${torrent.leechers} | ⬇️ ${torrent.downloads}`, 
                    inline: true 
                },
                { 
                    name: '🔒 Trusted', 
                    value: torrent.trusted === 'Yes' ? 'Yes' : 'No', 
                    inline: true 
                },
                { 
                    name: '🔗 Links', 
                    value: `[Download](${torrent.downloadLink}) | [Details](${torrent.viewLink})` 
                }
            )
            .setTimestamp()
            .setFooter({ 
                text: `Nyaa.si Bot | Hash: ${torrent.infoHash.substring(0, 8)}...` 
            });

        await channel.send({ embeds: [embed] });
        console.log(`Notification sent: ${torrent.title}`);

    } catch (error) {
        console.error('Discord notification error:', error);
    }
}

/**
 * Gets appropriate emoji for torrent category
 * @function getCategoryEmoji
 * @param {string} category - Torrent category
 * @returns {string} Emoji for the category
 */
function getCategoryEmoji(category) {
    if (category.includes('Anime')) return '🎌';
    if (category.includes('Literature')) return '📚';
    if (category.includes('Live Action')) return '🎬';
    if (category.includes('Pictures')) return '🖼️';
    if (category.includes('Music')) return '🎵';
    if (category.includes('Software')) return '💻';
    return '📁';
}

/**
 * Message event handler for processing bot commands
 * Handles all user commands and interactions
 */
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    
    const args = message.content.split(' ');
    const command = args[0].toLowerCase();
    
    /**
     * Command: !nyaa-status
     * Shows bot status and statistics
     */
    if (command === '!nyaa-status') {
        const lastChecked = await db.get('lastCheckedTorrents') || [];
        const totalUsers = Object.keys(await db.get('userSubscriptions') || {}).length;
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('📊 Bot Status')
            .addFields(
                { name: '🤖 Status', value: 'Active', inline: true },
                { name: '📈 Tracked torrents', value: lastChecked.length.toString(), inline: true },
                { name: '👥 Registered users', value: totalUsers.toString(), inline: true },
                { name: '⏰ Check interval', value: `${config.checkInterval / 1000} seconds`, inline: true },
                { name: '🌐 RSS URL', value: config.nyaaRssUrl, inline: false }
            )
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
    
    /**
     * Command: !nyaa-check
     * Manually triggers RSS feed check
     */
    else if (command === '!nyaa-check') {
        const checkMsg = await message.reply('🔍 Starting manual check...');
        await checkNyaaFeed();
        await checkMsg.edit('✅ Check completed!');
    }
    
    /**
     * Command: !nyaa-subscribe [keyword]
     * Subscribe to keyword notifications
     */
    else if (command === '!nyaa-subscribe') {
        if (args.length < 2) {
            await message.reply('❌ Usage: `!nyaa-subscribe [keyword]`');
            return;
        }
        
        const keyword = args.slice(1).join(' ').toLowerCase();
        const userId = message.author.id;
        
        let userSubscriptions = await db.get('userSubscriptions') || {};
        if (!userSubscriptions[userId]) {
            userSubscriptions[userId] = [];
        }
        
        if (userSubscriptions[userId].includes(keyword)) {
            await message.reply(`❌ You are already subscribed to **${keyword}**!`);
            return;
        }
        
        if (userSubscriptions[userId].length >= 10) {
            await message.reply('❌ Maximum 10 keyword subscriptions allowed!');
            return;
        }
        
        userSubscriptions[userId].push(keyword);
        await db.set('userSubscriptions', userSubscriptions);
        
        await message.reply(`✅ Successfully subscribed to **${keyword}**! New torrents will be sent via DM.`);
    }
    
    /**
     * Command: !nyaa-unsubscribe [keyword]
     * Unsubscribe from keyword notifications
     */
    else if (command === '!nyaa-unsubscribe') {
        if (args.length < 2) {
            await message.reply('❌ Usage: `!nyaa-unsubscribe [keyword]`');
            return;
        }
        
        const keyword = args.slice(1).join(' ').toLowerCase();
        const userId = message.author.id;
        
        let userSubscriptions = await db.get('userSubscriptions') || {};
        if (!userSubscriptions[userId] || !userSubscriptions[userId].includes(keyword)) {
            await message.reply(`❌ You are not subscribed to **${keyword}**!`);
            return;
        }
        
        userSubscriptions[userId] = userSubscriptions[userId].filter(k => k !== keyword);
        if (userSubscriptions[userId].length === 0) {
            delete userSubscriptions[userId];
        }
        
        await db.set('userSubscriptions', userSubscriptions);
        await message.reply(`✅ Successfully unsubscribed from **${keyword}**!`);
    }
    
    /**
     * Command: !nyaa-mylist
     * Shows user's subscription list
     */
    else if (command === '!nyaa-mylist') {
        const userId = message.author.id;
        const userSubscriptions = await db.get('userSubscriptions') || {};
        const mySubscriptions = userSubscriptions[userId] || [];
        
        if (mySubscriptions.length === 0) {
            await message.reply('📝 You have no keyword subscriptions yet!\nUsage: `!nyaa-subscribe [keyword]`');
            return;
        }
        
        const embed = new EmbedBuilder()
            .setColor('#4CAF50')
            .setTitle('📋 Your Subscription List')
            .setDescription(mySubscriptions.map((keyword, index) => `${index + 1}. **${keyword}**`).join('\n'))
            .setFooter({ text: `Total ${mySubscriptions.length}/10 subscriptions` })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
    
    /**
     * Command: !nyaa-top-today
     * Shows today's most popular torrents from RSS
     */
    else if (command === '!nyaa-top-today') {
        const loadingMsg = await message.reply('🔍 Fetching today\'s most popular torrents...');
        
        try {
            const response = await fetch(config.nyaaRssUrl);
            const xmlData = await response.text();
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(xmlData);
            const items = result.rss.channel[0].item || [];
            
            if (items.length === 0) {
                await loadingMsg.edit('📊 No data available from RSS feed.');
                return;
            }
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const todayTorrents = items
                .filter(item => {
                    const itemDate = new Date(item.pubDate[0]);
                    return itemDate >= today;
                })
                .map(item => ({
                    title: item.title[0],
                    seeders: parseInt(item['nyaa:seeders'] ? item['nyaa:seeders'][0] : '0'),
                    downloads: parseInt(item['nyaa:downloads'] ? item['nyaa:downloads'][0] : '0'),
                    category: item['nyaa:category'] ? item['nyaa:category'][0] : 'Unknown',
                    viewLink: item.guid[0]._,
                    trusted: item['nyaa:trusted'] ? item['nyaa:trusted'][0] : 'No'
                }))
                .sort((a, b) => (b.seeders + b.downloads) - (a.seeders + a.downloads))
                .slice(0, 10);
            
            if (todayTorrents.length === 0) {
                await loadingMsg.edit('📊 No torrents found for today.');
                return;
            }
            
            const embed = new EmbedBuilder()
                .setColor('#FF9800')
                .setTitle('🔥 Today\'s Most Popular Torrents (Live RSS)')
                .setDescription(todayTorrents.map((torrent, index) => 
                    `${index + 1}. **[${torrent.title.substring(0, 60)}${torrent.title.length > 60 ? '...' : ''}](${torrent.viewLink})**\n` +
                    `   📊 ${torrent.seeders} seeders | ⬇️ ${torrent.downloads} downloads | ${torrent.trusted === 'Yes' ? '✅' : '⚠️'}\n`
                ).join('\n'))
                .setFooter({ text: `Total ${todayTorrents.length} torrents found` })
                .setTimestamp();
            
            await loadingMsg.edit({ content: '', embeds: [embed] });
            
        } catch (error) {
            console.error('RSS fetch error:', error);
            await loadingMsg.edit('❌ Error occurred while fetching RSS data.');
        }
    }
    
    /**
     * Command: !nyaa-top-week
     * Shows this week's most popular torrents from RSS
     */
    else if (command === '!nyaa-top-week') {
        const loadingMsg = await message.reply('🔍 Fetching this week\'s most popular torrents...');
        
        try {
            const response = await fetch(config.nyaaRssUrl);
            const xmlData = await response.text();
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(xmlData);
            const items = result.rss.channel[0].item || [];
            
            if (items.length === 0) {
                await loadingMsg.edit('📊 No data available from RSS feed.');
                return;
            }
            
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            const weekTorrents = items
                .filter(item => {
                    const itemDate = new Date(item.pubDate[0]);
                    return itemDate >= oneWeekAgo;
                })
                .map(item => ({
                    title: item.title[0],
                    seeders: parseInt(item['nyaa:seeders'] ? item['nyaa:seeders'][0] : '0'),
                    downloads: parseInt(item['nyaa:downloads'] ? item['nyaa:downloads'][0] : '0'),
                    category: item['nyaa:category'] ? item['nyaa:category'][0] : 'Unknown',
                    viewLink: item.guid[0]._,
                    trusted: item['nyaa:trusted'] ? item['nyaa:trusted'][0] : 'No',
                    pubDate: new Date(item.pubDate[0])
                }))
                .sort((a, b) => (b.seeders + b.downloads) - (a.seeders + a.downloads))
                .slice(0, 10);
            
            if (weekTorrents.length === 0) {
                await loadingMsg.edit('📊 No torrents found for this week.');
                return;
            }
            
            const embed = new EmbedBuilder()
                .setColor('#9C27B0')
                .setTitle('📅 This Week\'s Most Popular Torrents (Live RSS)')
                .setDescription(weekTorrents.map((torrent, index) => 
                    `${index + 1}. **[${torrent.title.substring(0, 60)}${torrent.title.length > 60 ? '...' : ''}](${torrent.viewLink})**\n` +
                    `   📊 ${torrent.seeders} seeders | ⬇️ ${torrent.downloads} downloads | ${torrent.trusted === 'Yes' ? '✅' : '⚠️'}\n` +
                    `   📅 ${torrent.pubDate.toLocaleDateString('en-US')}\n`
                ).join('\n'))
                .setFooter({ text: `Last 7 days | Total ${weekTorrents.length} torrents` })
                .setTimestamp();
            
            await loadingMsg.edit({ content: '', embeds: [embed] });
            
        } catch (error) {
            console.error('RSS fetch error:', error);
            await loadingMsg.edit('❌ Error occurred while fetching RSS data.');
        }
    }
    
    /**
     * Command: !nyaa-most-seeded
     * Shows most seeded torrents from RSS
     */
    else if (command === '!nyaa-most-seeded') {
        const loadingMsg = await message.reply('🔍 Fetching most seeded torrents...');
        
        try {
            const response = await fetch(config.nyaaRssUrl);
            const xmlData = await response.text();
            const parser = new xml2js.Parser();
            const result = await parser.parseStringPromise(xmlData);
            const items = result.rss.channel[0].item || [];
            
            if (items.length === 0) {
                await loadingMsg.edit('📊 No data available from RSS feed.');
                return;
            }
            
            const mostSeededTorrents = items
                .map(item => ({
                    title: item.title[0],
                    seeders: parseInt(item['nyaa:seeders'] ? item['nyaa:seeders'][0] : '0'),
                    leechers: parseInt(item['nyaa:leechers'] ? item['nyaa:leechers'][0] : '0'),
                    downloads: parseInt(item['nyaa:downloads'] ? item['nyaa:downloads'][0] : '0'),
                    category: item['nyaa:category'] ? item['nyaa:category'][0] : 'Unknown',
                    viewLink: item.guid[0]._,
                    trusted: item['nyaa:trusted'] ? item['nyaa:trusted'][0] : 'No',
                    size: item['nyaa:size'] ? item['nyaa:size'][0] : 'Unknown'
                }))
                .filter(torrent => torrent.seeders > 0)
                .sort((a, b) => b.seeders - a.seeders)
                .slice(0, 10);
            
            if (mostSeededTorrents.length === 0) {
                await loadingMsg.edit('📊 No torrents with seeders found.');
                return;
            }
            
            const embed = new EmbedBuilder()
                .setColor('#4CAF50')
                .setTitle('🌱 Most Seeded Torrents (Live RSS)')
                .setDescription(mostSeededTorrents.map((torrent, index) => 
                    `${index + 1}. **[${torrent.title.substring(0, 55)}${torrent.title.length > 55 ? '...' : ''}](${torrent.viewLink})**\n` +
                    `   🌱 ${torrent.seeders} seeders | 📥 ${torrent.leechers} leechers | ${torrent.trusted === 'Yes' ? '✅' : '⚠️'}\n` +
                    `   ${getCategoryEmoji(torrent.category)} ${torrent.category} | 📏 ${torrent.size}\n`
                ).join('\n'))
                .setFooter({ text: `Most active torrents | Total ${mostSeededTorrents.length} torrents` })
                .setTimestamp();
            
            await loadingMsg.edit({ content: '', embeds: [embed] });
            
        } catch (error) {
            console.error('RSS fetch error:', error);
            await loadingMsg.edit('❌ Error occurred while fetching RSS data.');
        }
    }
    
    /**
     * Command: !nyaa-help
     * Shows all available bot commands
     */
    else if (command === '!nyaa-help') {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🛠️ Bot Commands')
            .setDescription('Nyaa.si Discord Bot commands:')
            .addFields(
                { name: '**📊 General Commands**', value: '\u200b', inline: false },
                { name: '!nyaa-status', value: 'Shows bot status and statistics', inline: false },
                { name: '!nyaa-check', value: 'Manually triggers RSS feed check', inline: false },
                { name: '!nyaa-help', value: 'Shows this help message', inline: false },
                { name: '**🔔 Subscription System**', value: '\u200b', inline: false },
                { name: '!nyaa-subscribe [keyword]', value: 'Subscribe to keyword notifications', inline: false },
                { name: '!nyaa-unsubscribe [keyword]', value: 'Unsubscribe from keyword notifications', inline: false },
                { name: '!nyaa-mylist', value: 'Show your subscription list', inline: false },
                { name: '**📈 Statistics**', value: '\u200b', inline: false },
                { name: '!nyaa-top-today', value: 'Show today\'s most popular torrents', inline: false },
                { name: '!nyaa-top-week', value: 'Show this week\'s most popular torrents', inline: false },
                { name: '!nyaa-most-seeded', value: 'Show most seeded torrents', inline: false }
            )
            .setFooter({ text: 'Personal notifications are sent via DM!' })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
});

/**
 * Login to Discord with the bot token
 */
client.login(config.discordToken); 