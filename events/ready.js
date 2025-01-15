const Logger = require('../utils/logger');
const moment = require('moment-timezone');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        try {
            // Set bot presence
            client.user.setPresence({
                activities: [{
                    name: '/help',
                    type: 2 // "Listening to"
                }],
                status: 'online'
            });

            // Load commands
            const totalCommands = client.commands.size;

            // Log bot startup
            await Logger.log('BOT_STARTUP', {
                type: 'STARTUP',
                totalCommands: totalCommands,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'),
                version: require('../package.json').version
            });

            console.log(`[${moment().tz('Asia/Jakarta').format('HH:mm:ss')}] ${client.user.tag} siap dengan ${totalCommands} commands!`);

            // Check and clean expired test roles
            await checkExpiredTestRoles(client);

            // Set interval to check expired test roles every minute
            setInterval(() => checkExpiredTestRoles(client), 60000);

        } catch (error) {
            console.error('Error in ready event:', error);
            await Logger.log('ERROR', {
                type: 'READY_ERROR',
                error: error.message,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });
        }
    }
};

async function checkExpiredTestRoles(client) {
    try {
        const guilds = client.guilds.cache;

        for (const [, guild] of guilds) {
            const testRoles = guild.roles.cache.filter(role => 
                role.name.startsWith('[Test]')
            );

            for (const [, role] of testRoles) {
                // Check role creation time
                const roleAge = Date.now() - role.createdTimestamp;
                
                // If role is older than 2 minutes (or custom duration from data)
                if (roleAge >= 120000) { // Default 2 minutes
                    try {
                        // Get the member who has this role
                        const member = role.members.first();
                        
                        if (member) {
                            // Remove the role
                            await member.roles.remove(role);
                            
                            // Delete the role
                            await role.delete('Test role expired');

                            // Log test role expiration
                            await Logger.log('TEST_ROLE_EXPIRED', {
                                guildId: guild.id,
                                type: 'TEST_ROLE_EXPIRED',
                                roleId: role.id,
                                userId: member.id,
                                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
                            });

                            // Send DM to member
                            await member.send({
                                content: `⌛ Role test kamu di server ${guild.name} telah berakhir.`
                            }).catch(() => {});
                        }
                    } catch (error) {
                        console.error(`Error removing expired test role ${role.id}:`, error);
                        await Logger.log('ERROR', {
                            guildId: guild.id,
                            type: 'TEST_ROLE_EXPIRE_ERROR',
                            error: error.message,
                            roleId: role.id,
                            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error checking expired test roles:', error);
        await Logger.log('ERROR', {
            type: 'CHECK_EXPIRED_ROLES_ERROR',
            error: error.message,
            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
        });
    }
}
