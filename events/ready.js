const { ActivityType } = require('discord.js');
const Logger = require('../utils/logger');
const moment = require('moment');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        try {
            // Initialize logger
            await Logger.init();

            // Set bot activity
            client.user.setPresence({
                activities: [{ 
                    name: '/help',
                    type: ActivityType.Listening
                }],
                status: 'online'
            });

            // Log startup
            console.log(`[${moment().utc().format('YYYY-MM-DD HH:mm:ss')}] Ready! Logged in as ${client.user.tag}`);
            
            await Logger.log('BOT_READY', {
                type: 'STARTUP',
                botId: client.user.id,
                username: client.user.tag,
                guilds: client.guilds.cache.size,
                timestamp: '2025-01-15 08:47:51'
            });

            // Check test roles in all guilds
            await checkTestRoles(client);

            // Schedule regular checks
            setInterval(() => checkTestRoles(client), 300000); // Every 5 minutes
            setInterval(() => cleanupLogs(client), 86400000); // Every 24 hours

        } catch (error) {
            console.error('Error in ready event:', error);
            await Logger.log('ERROR', {
                type: 'READY_ERROR',
                error: error.message,
                timestamp: '2025-01-15 08:47:51'
            });
        }
    }
};

/**
 * Check and cleanup expired test roles
 * @param {Client} client - Discord client
 */
async function checkTestRoles(client) {
    try {
        for (const [guildId, guild] of client.guilds.cache) {
            // Get all test roles
            const testRoles = guild.roles.cache.filter(role => 
                role.name.startsWith('[TEST]')
            );

            if (!testRoles.size) continue;

            for (const [roleId, role] of testRoles) {
                // Check role age
                const roleAge = Date.now() - role.createdTimestamp;
                
                // If role is older than 2 minutes + 30s buffer
                if (roleAge > 150000) {
                    try {
                        // Get role members
                        const members = role.members;
                        
                        // Remove role from all members
                        for (const [memberId, member] of members) {
                            await member.roles.remove(role);
                            
                            // Try to send DM
                            try {
                                await member.send({
                                    content: `⌛ Role test kamu di server ${guild.name} telah berakhir.`
                                });
                            } catch {
                                // Ignore DM errors
                            }
                        }

                        // Delete role
                        await role.delete('Test role expired');

                        await Logger.log('TEST_ROLE_EXPIRE', {
                            guildId: guildId,
                            type: 'TEST_ROLE_AUTO_EXPIRE',
                            roleId: roleId,
                            memberCount: members.size,
                            timestamp: '2025-01-15 08:47:51'
                        });

                    } catch (error) {
                        console.error(`Error cleaning up test role ${roleId}:`, error);
                        await Logger.log('ERROR', {
                            guildId: guildId,
                            type: 'TEST_ROLE_CLEANUP_ERROR',
                            roleId: roleId,
                            error: error.message,
                            timestamp: '2025-01-15 08:47:51'
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error in checkTestRoles:', error);
        await Logger.log('ERROR', {
            type: 'TEST_ROLES_CHECK_ERROR',
            error: error.message,
            timestamp: '2025-01-15 08:47:51'
        });
    }
}

/**
 * Cleanup old logs
 * @param {Client} client - Discord client
 */
async function cleanupLogs(client) {
    try {
        for (const [guildId, guild] of client.guilds.cache) {
            const deletedCount = await Logger.clearOldLogs(guildId);
            
            if (deletedCount > 0) {
                await Logger.log('LOGS_CLEANUP', {
                    guildId: guildId,
                    type: 'OLD_LOGS_DELETED',
                    count: deletedCount,
                    timestamp: '2025-01-15 08:47:51'
                });
            }
        }
    } catch (error) {
        console.error('Error in cleanupLogs:', error);
        await Logger.log('ERROR', {
            type: 'LOGS_CLEANUP_ERROR',
            error: error.message,
            timestamp: '2025-01-15 08:47:51'
        });
    }
}