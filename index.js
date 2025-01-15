const { 
    Client, 
    Collection, 
    GatewayIntentBits, 
    ActivityType 
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const Logger = require('./utils/logger');
const moment = require('moment-timezone');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
    ]
});

// Collections
client.commands = new Collection();
client.cooldowns = new Collection();
client.roleMenus = new Collection();

// Load Commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`📥 Loaded command: ${command.data.name}`);
    }
}

// Load Events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
    console.log(`📥 Loaded event: ${event.name}`);
}

// Ready Event
client.once('ready', async () => {
    // Set bot status
    client.user.setPresence({
        activities: [{
            name: '/settings | Custom Role',
            type: ActivityType.Playing
        }],
        status: 'online'
    });

    // Get total users across all guilds
    const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                   Custom Role Bot - Now Online!                    ║
╠═══════════════════════════════════════════════════════════════════╣
║ Informasi Bot:                                                    ║
║ • Nama: ${client.user.tag}                                        
║ • Versi: 1.0.0                                                    
║ • Commands: ${client.commands.size}                               
║ • Waktu: ${moment().tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss')} 
║ • Developer: ${config.DEVELOPER}                                  
╚═══════════════════════════════════════════════════════════════════╝
    `);

    // Log startup
    await Logger.log('SYSTEM', {
        type: 'BOT_STARTUP',
        botTag: client.user.tag,
        totalServers: client.guilds.cache.size,
        totalUsers: totalUsers,
        totalCommands: client.commands.size,
        startupTime: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'),
        startedBy: config.DEVELOPER
    });

    // Log guild information
    client.guilds.cache.forEach(async guild => {
        console.log(`📌 Server: ${guild.name} (${guild.id})
   ├ Members: ${guild.memberCount}
   ├ Channels: ${guild.channels.cache.size}
   └ Roles: ${guild.roles.cache.size}`);

        await Logger.log('SYSTEM', {
            type: 'GUILD_INFO',
            id: guild.id,
            name: guild.name,
            members: guild.memberCount,
            channels: guild.channels.cache.size,
            roles: guild.roles.cache.size,
            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
        });
    });
});

// Error handling
process.on('unhandledRejection', async error => {
    console.error('Unhandled promise rejection:', error);
    await Logger.log('ERROR', {
        type: 'UNHANDLED_REJECTION',
        error: error.message,
        stack: error.stack,
        timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
    });
});

// Login
client.login(config.TOKEN);