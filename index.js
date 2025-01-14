const { Events } = require('discord.js');
const Logger = require('../utils/logger');
const moment = require('moment-timezone');
const { version } = require('../package.json');

// Fungsi untuk mendapatkan waktu Jakarta
const getJakartaTime = () => {
    const now = new Date();
    const utcOffset = 7; // UTC+7 for Jakarta/Indonesia
    now.setHours(now.getHours() + utcOffset);
    return now.toISOString().replace('T', ' ').slice(0, 19);
};

class ReadyHandler {
    static async handle(client) {
        try {
            await this.initializeBot(client);
            await this.logStartup(client);
            await this.startPeriodicTasks(client);
        } catch (error) {
            console.error('Error in ready event:', error);
            await Logger.log('ERROR', {
                type: 'STARTUP_ERROR',
                error: error.message,
                stack: error.stack,
                timestamp: getJakartaTime()
            });
        }
    }

    static async initializeBot(client) {
        // Set bot presence
        await client.user.setPresence({
            activities: [{
                name: 'your commands',
                type: 3 // WATCHING
            }],
            status: 'online'
        });
    }

    static async logStartup(client) {
        const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        const currentTime = getJakartaTime();

        // Console logs with colors
        console.log('\x1b[36m%s\x1b[0m', '══════════════════════════════════════');
        console.log('\x1b[32m%s\x1b[0m', '✅ Bot is now online!');
        console.log('\x1b[33m%s\x1b[0m', `📡 Connected as: ${client.user.tag}`);
        console.log('\x1b[33m%s\x1b[0m', `👥 Serving: ${client.guilds.cache.size} servers`);
        console.log('\x1b[33m%s\x1b[0m', `👤 Users: ${totalUsers} users`);
        console.log('\x1b[33m%s\x1b[0m', `⌚ Current Time (UTC+7): ${currentTime}`);
        console.log('\x1b[33m%s\x1b[0m', `🤖 Bot Version: ${version}`);
        console.log('\x1b[33m%s\x1b[0m', `📋 Commands Loaded: ${client.commands.size}`);
        console.log('\x1b[36m%s\x1b[0m', '══════════════════════════════════════');

        // Log to logger system
        await Logger.log('SYSTEM', {
            type: 'BOT_STARTUP',
            message: [
                '🚀 Bot has started up successfully!',
                `📡 Connected as: ${client.user.tag}`,
                `👥 Servers: ${client.guilds.cache.size}`,
                `👤 Users: ${totalUsers}`,
                `📋 Commands: ${client.commands.size}`,
                `⌚ Startup Time (UTC+7): ${currentTime}`,
                `👨‍💻 Started by: Catyro`,
                `🤖 Version: ${version}`
            ].join('\n'),
            userId: client.user.id,
            timestamp: currentTime
        });

        // Log detailed server information
        client.guilds.cache.forEach(async guild => {
            console.log('\x1b[34m%s\x1b[0m', `📌 Connected to server: ${guild.name} (${guild.id})`);
            console.log('\x1b[34m%s\x1b[0m', `   ├ Members: ${guild.memberCount}`);
            console.log('\x1b[34m%s\x1b[0m', `   ├ Channels: ${guild.channels.cache.size}`);
            console.log('\x1b[34m%s\x1b[0m', `   └ Roles: ${guild.roles.cache.size}`);

            await Logger.log('SYSTEM', {
                type: 'GUILD_INFO',
                guildId: guild.id,
                guildName: guild.name,
                members: guild.memberCount,
                channels: guild.channels.cache.size,
                roles: guild.roles.cache.size,
                timestamp: currentTime
            });
        });

        console.log('\x1b[32m%s\x1b[0m', '✨ All systems operational!');
    }

    static async startPeriodicTasks(client) {
        // Check for expired boosts every hour
        setInterval(async () => {
            try {
                await this.checkExpiredBoosts(client);
            } catch (error) {
                console.error('Error checking expired boosts:', error);
                await Logger.log('ERROR', {
                    type: 'BOOST_CHECK',
                    error: error.message,
                    timestamp: getJakartaTime()
                });
            }
        }, 60 * 60 * 1000); // Every hour

        // Cleanup old logs every day
        setInterval(async () => {
            try {
                await Logger.rotateLogFiles();
            } catch (error) {
                console.error('Error rotating logs:', error);
                await Logger.log('ERROR', {
                    type: 'LOG_ROTATION',
                    error: error.message,
                    timestamp: getJakartaTime()
                });
            }
        }, 24 * 60 * 60 * 1000); // Every 24 hours
    }

    static async checkExpiredBoosts(client) {
        const guilds = client.guilds.cache;
        for (const [, guild] of guilds) {
            try {
                const members = await guild.members.fetch();
                
                for (const [, member] of members) {
                    // Skip if member is still boosting
                    if (member.premiumSince) continue;

                    // Check for expired custom roles
                    const userRoles = await RoleManager.getUserRoles(member.id);
                    if (!userRoles.length) continue;

                    // Process expired roles
                    for (const roleData of userRoles) {
                        try {
                            const role = guild.roles.cache.get(roleData.roleId);
                            if (!role) continue;

                            // Remove role from target
                            const targetMember = await guild.members.fetch(roleData.targetId);
                            if (targetMember) {
                                await targetMember.roles.remove(role);
                            }

                            // Delete the role
                            await role.delete('Boost expired - Automatic cleanup');

                            // Log role deletion
                            await Logger.log('ROLE_DELETE', {
                                type: 'BOOST_EXPIRED',
                                userId: member.id,
                                roleId: role.id,
                                guildId: guild.id,
                                timestamp: getJakartaTime()
                            });
                        } catch (error) {
                            console.error(`Error processing expired role ${roleData.roleId}:`, error);
                        }
                    }

                    // Clear user's custom roles from database
                    await RoleManager.clearUserRoles(member.id);

                    // Notify user about expired roles
                    try {
                        await member.send({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor(0xe74c3c)
                                    .setTitle('❌ Custom Roles Expired')
                                    .setDescription(
                                        'Your custom roles have been removed because your server boost has expired.\n' +
                                        'Boost the server again to create new custom roles!'
                                    )
                                    .setTimestamp()
                            ]
                        });
                    } catch (error) {
                        console.error(`Error sending expiration notification to ${member.id}:`, error);
                    }
                }
            } catch (error) {
                console.error(`Error checking boosts in guild ${guild.id}:`, error);
                await Logger.log('ERROR', {
                    type: 'BOOST_CHECK',
                    guildId: guild.id,
                    error: error.message,
                    timestamp: getJakartaTime()
                });
            }
        }
    }
}

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        await ReadyHandler.handle(client);
    }
};
