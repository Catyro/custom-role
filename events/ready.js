const { Events, ActivityType } = require('discord.js');
const Logger = require('../utils/logger');
const config = require('../config');
const moment = require('moment-timezone');

class ReadyHandler {
    static async handle(client) {
        try {
            await this.initializeBot(client);
            await this.logStartup(client);
        } catch (error) {
            console.error('Error in ready event:', error);
            await Logger.log('ERROR', {
                type: 'STARTUP_ERROR',
                error: error.message,
                stack: error.stack,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });
        }
    }

    static async initializeBot(client) {
        await client.user.setPresence({
            activities: [{
                name: 'Boosted Members',
                type: ActivityType.Watching
            }],
            status: 'online'
        });
    }

    static async logStartup(client) {
        const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        const currentTime = moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');

        // Log startup info
        const startupInfo = {
            botTag: client.user.tag,
            totalServers: client.guilds.cache.size,
            totalUsers: totalUsers,
            totalCommands: client.commands.size,
            startupTime: currentTime,
            startedBy: 'Catyro'
        };

        // Console logs with colors
        console.log('\x1b[36m%s\x1b[0m', '═'.repeat(50));
        console.log('\x1b[32m%s\x1b[0m', '✅ Bot is now online!');
        console.log('\x1b[33m%s\x1b[0m', `📡 Connected as: ${startupInfo.botTag}`);
        console.log('\x1b[33m%s\x1b[0m', `👥 Serving: ${startupInfo.totalServers} servers`);
        console.log('\x1b[33m%s\x1b[0m', `👤 Users: ${startupInfo.totalUsers}`);
        console.log('\x1b[33m%s\x1b[0m', `⌚ Time: ${startupInfo.startupTime}`);
        console.log('\x1b[33m%s\x1b[0m', `📋 Commands: ${startupInfo.totalCommands}`);
        console.log('\x1b[36m%s\x1b[0m', '═'.repeat(50));

        // Log to logger system
        await Logger.log('SYSTEM', {
            type: 'BOT_STARTUP',
            ...startupInfo
        });

        // Log detailed server information
        for (const [, guild] of client.guilds.cache) {
            const guildInfo = {
                id: guild.id,
                name: guild.name,
                members: guild.memberCount,
                channels: guild.channels.cache.size,
                roles: guild.roles.cache.size
            };

            console.log('\x1b[34m%s\x1b[0m', `📌 Server: ${guildInfo.name} (${guildInfo.id})`);
            console.log('\x1b[34m%s\x1b[0m', `   ├ Members: ${guildInfo.members}`);
            console.log('\x1b[34m%s\x1b[0m', `   ├ Channels: ${guildInfo.channels}`);
            console.log('\x1b[34m%s\x1b[0m', `   └ Roles: ${guildInfo.roles}`);

            await Logger.log('SYSTEM', {
                type: 'GUILD_INFO',
                ...guildInfo,
                timestamp: currentTime
            });
        }

        console.log('\x1b[32m%s\x1b[0m', '✨ All systems operational!');
    }
}

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        await ReadyHandler.handle(client);
    }
};