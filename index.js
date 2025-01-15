require('dotenv').config();
const { 
    Client, 
    Collection, 
    GatewayIntentBits, 
    ActivityType,
    REST,
    Routes 
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const Logger = require('./utils/logger');
const moment = require('moment-timezone');

// Validasi environment variables
if (!process.env.DISCORD_TOKEN) {
    console.error('❌ Token bot tidak ditemukan di file .env');
    process.exit(1);
}

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
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        console.log(`📥 Loaded command: ${command.data.name}`);
    }
}

// Deploy Commands Function
async function deployCommands() {
    try {
        console.log(`📝 Memulai refresh ${commands.length} application (/) commands.`);

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        const data = await rest.put(
            Routes.applicationGuildCommands(
                process.env.DISCORD_CLIENT_ID, 
                process.env.DISCORD_GUILD_ID
            ),
            { body: commands }
        );

        console.log(`✅ Berhasil reload ${data.length} application (/) commands.`);
    } catch (error) {
        console.error('❌ Error saat deploy commands:', error);
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
    // Deploy commands when bot starts
    await deployCommands();

    // Set bot status
    client.user.setPresence({
        activities: [{
            name: '/settings | Custom Role',
            type: ActivityType.Playing
        }],
        status: 'online'
    });

    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                   Custom Role Bot - Now Online!                    ║
╠═══════════════════════════════════════════════════════════════════╣
║ Informasi Bot:                                                    ║
║ • Nama: ${client.user.tag}                                        
║ • Versi: 1.0.0                                                    
║ • Commands: ${client.commands.size}                               
║ • Waktu: ${moment().tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss')} 
║ • Developer: Catyro                                              
╚═══════════════════════════════════════════════════════════════════╝
    `);

    // Log startup
    await Logger.log('SYSTEM', {
        type: 'BOT_STARTUP',
        botTag: client.user.tag,
        totalServers: client.guilds.cache.size,
        totalUsers: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
        totalCommands: client.commands.size,
        startupTime: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'),
        startedBy: 'Catyro'
    });

    // Log guild information
    client.guilds.cache.forEach(async guild => {
        console.log(`📌 Server: ${guild.name} (${guild.id})
   ├ Members: ${guild.memberCount}
   ├ Channels: ${guild.channels.cache.size}
   └ Roles: ${guild.roles.cache.size}`);
    });
});

// Handle Interactions
client.on('interactionCreate', async interaction => {
    try {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            await command.execute(interaction);
        }
    } catch (error) {
        console.error('❌ Error handling interaction:', error);
        const errorMessage = 'Terjadi kesalahan saat menjalankan command!';
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
});

// Error handling
process.on('unhandledRejection', async error => {
    console.error('❌ Unhandled promise rejection:', error);
    await Logger.log('ERROR', {
        type: 'UNHANDLED_REJECTION',
        error: error.message,
        stack: error.stack,
        timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
    });
});

// Login dengan error handling yang lebih detail
client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log('✅ Bot berhasil login!');
    })
    .catch(error => {
        console.error('❌ Gagal login:', error.message);
        if (error.code === 'TokenInvalid') {
            console.error('Token tidak valid! Periksa kembali token di file .env');
        }
        process.exit(1);
    });