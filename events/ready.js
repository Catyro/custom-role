const { Events } = require('discord.js');
const Logger = require('../utils/logger');
const TimeFormatter = require('../utils/time-formatter');
const config = require('../config');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        // ASCII Art Banner (pilih salah satu versi saja)
        console.log('\n' + [
            '╔═════════════════════════════════════════════════════════════════════════╗',
            '║                                                                         ║',
            '║     ██████╗██╗   ██╗███████╗████████╗ ██████╗ ███╗   ███╗               ║',
            '║    ██╔════╝██║   ██║██╔════╝╚══██╔══╝██╔═══██╗████╗ ████║               ║',
            '║    ██║     ██║   ██║███████╗   ██║   ██║   ██║██╔████╔██║               ║',
            '║    ██║     ██║   ██║╚════██║   ██║   ██║   ██║██║╚██╔╝██║               ║',
            '║    ╚██████╗╚██████╔╝███████║   ██║   ╚██████╔╝██║ ╚═╝ ██║               ║',
            '║     ╚═════╝ ╚═════╝ ╚══════╝   ╚═╝    ╚═════╝ ╚═╝     ╚═╝               ║',
            '║                                                                         ║',
            '║                    ██████╗  ██████╗ ██╗     ███████╗                    ║',
            '║                    ██╔══██╗██╔═══██╗██║     ██╔════╝                    ║',
            '║                    ██████╔╝██║   ██║██║     █████╗                      ║',
            '║                    ██╔══██╗██║   ██║██║     ██╔══╝                      ║',
            '║                    ██║  ██║╚██████╔╝███████╗███████╗                    ║',
            '║                    ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚══════╝                    ║',
            '║                                                                         ║',
            '╚═════════════════════════════════════════════════════════════════════════╝'
        ].join('\n') + '\n');

        // Bot Information
        const timestamp = TimeFormatter.getCurrentTimestamp(); // Gunakan TimeFormatter
        const botInfo = [
            `[📡] Gateway    : Connected as ${client.user.tag}`,
            `[💓] Heartbeat  : ${client.ws.ping}ms`,
            `[🏠] Guilds     : ${client.guilds.cache.size} servers`,
            `[👥] Users      : ${client.users.cache.reduce((acc, user) => acc + (!user.bot ? 1 : 0), 0)} users`,
            `[💬] Channels   : ${client.channels.cache.size} channels`,
            `[⌚] Time       : ${timestamp}`,
            `[🤖] Bot Status : Online and ready!`,
            `[👨‍💻] Developer : ${config.DEVELOPER}`,
            '\n[✨] Custom Role Bot is now online and ready to serve!'
        ];

        console.log(botInfo.join('\n'));
        
        // Set bot presence
        client.user.setPresence({
            activities: [{ 
                name: `with ${client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)} users | ${config.EMOJIS.ROLE}`,
                type: 2 // "Listening to"
            }],
            status: 'online'
        });

        // Log startup
        await Logger.log('BOT_STARTUP', {
            botTag: client.user.tag,
            totalServers: client.guilds.cache.size,
            totalUsers: client.users.cache.reduce((acc, user) => acc + (!user.bot ? 1 : 0), 0),
            totalCommands: client.commands.size,
            startupTime: timestamp,
            startedBy: 'Caatyro',
            timestamp: timestamp,
            loggedAt: timestamp
        });
    },
};
