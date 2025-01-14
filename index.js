const fs = require('fs');
const path = require('path');
const { 
    Client, 
    Collection, 
    GatewayIntentBits, 
    Partials,
    ActivityType,
    REST,
    Routes
} = require('discord.js');
const Logger = require('./utils/logger');
const config = require('./config.js');

// Fungsi untuk mendapatkan waktu Jakarta
const getJakartaTime = () => {
    const now = new Date();
    const utcOffset = 7; // UTC+7 for Jakarta/Indonesia
    now.setHours(now.getHours() + utcOffset);
    return now.toISOString().replace('T', ' ').slice(0, 19);
};

// Fungsi untuk deploy commands
async function deployCommands(commands) {
    try {
        console.log('Started refreshing application (/) commands.');
        const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);

        await rest.put(
            Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, config.DISCORD_GUILD_ID),
            { body: commands }
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error deploying commands:', error);
        throw error;
    }
}

// Fungsi untuk memvalidasi config
const validateConfig = () => {
    const requiredFields = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_GUILD_ID'];
    for (const field of requiredFields) {
        if (!config[field]) {
            throw new Error(`Missing required config field: ${field}`);
        }
    }
};

// Fungsi untuk memastikan direktori ada
const ensureDirectory = (dirPath) => {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    } catch (error) {
        console.error(`Failed to create directory ${dirPath}:`, error);
        throw error;
    }
};

// Fungsi untuk graceful shutdown
const gracefulShutdown = async () => {
    console.log('Shutting down gracefully...');
    await Logger.log('SHUTDOWN', {
        message: 'Bot is shutting down',
        timestamp: getJakartaTime()
    });
    client.destroy();
    process.exit(0);
};

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.Reaction
    ]
});

// Collections
client.commands = new Collection();
client.cooldowns = new Collection();
client.config = config;

// Set client di Logger
Logger.setClient(client);

// Load dan deploy commands
const loadAndDeployCommands = async () => {
    const commandsPath = path.join(__dirname, 'commands');
    ensureDirectory(commandsPath);
    
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    const commandsData = [];

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        try {
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                commandsData.push(command.data.toJSON());
                console.log(`✅ Loaded command: ${command.data.name}`);
            } else {
                console.log(`⚠️ Command at ${filePath} missing required properties`);
            }
        } catch (error) {
            console.error(`❌ Error loading command ${file}:`, error);
        }
    }

    // Deploy commands
    await deployCommands(commandsData);
};

// Load events
const loadEvents = async () => {
    const eventsPath = path.join(__dirname, 'events');
    ensureDirectory(eventsPath);
    
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        try {
            const event = require(filePath);
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            } else {
                client.on(event.name, (...args) => event.execute(...args));
            }
            console.log(`✅ Loaded event: ${event.name}`);
        } catch (error) {
            console.error(`❌ Error loading event ${file}:`, error);
        }
    }
};

// Command handler
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    const { cooldowns } = client;

    if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.data.name);
    const defaultCooldownDuration = 3;
    const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

    if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return interaction.reply({
                content: `Please wait ${timeLeft.toFixed(1)} more second(s) before using \`${command.data.name}\` again.`,
                ephemeral: true
            });
        }
    }

    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

    try {
        await command.execute(interaction);
        
        // Log command execution
        await Logger.log('COMMAND_EXECUTE', {
            command: command.data.name,
            userId: interaction.user.id,
            user: `<@${interaction.user.id}>`,
            timestamp: getJakartaTime()
        });
    } catch (error) {
        console.error(`❌ Command error:`, error);
        
        // Log error
        await Logger.log('ERROR', {
            command: command.data.name,
            userId: interaction.user.id,
            user: `<@${interaction.user.id}>`,
            error: error.message,
            timestamp: getJakartaTime()
        });

        const errorMessage = {
            content: 'There was an error while executing this command!',
            ephemeral: true,
            embeds: [{
                color: parseInt(config.EMBED_COLORS.ERROR.replace('#', ''), 16),
                description: `Error: ${error.message}`
            }]
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

// Rate limit handler
client.on('rateLimit', (rateLimitInfo) => {
    console.warn('Rate limit hit:', rateLimitInfo);
    Logger.log('SYSTEM', {
        type: 'RATE_LIMIT',
        message: `Rate limit hit: ${rateLimitInfo.timeout}ms (${rateLimitInfo.limit} requests)`,
        timestamp: getJakartaTime()
    });
});

// Handle process events
process.on('unhandledRejection', error => {
    console.error('❌ Unhandled promise rejection:', error);
    Logger.log('ERROR', {
        type: 'UNHANDLED_REJECTION',
        error: error.message,
        timestamp: getJakartaTime()
    });
});

process.on('uncaughtException', error => {
    console.error('❌ Uncaught exception:', error);
    Logger.log('ERROR', {
        type: 'UNCAUGHT_EXCEPTION',
        error: error.message,
        timestamp: getJakartaTime()
    }).finally(() => {
        process.exit(1);
    });
});

// Graceful shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Bot ready event
client.on('ready', async () => {
    try {
        // Set bot presence
        client.user.setPresence({
            activities: [{
                name: 'your commands',
                type: ActivityType.Watching
            }],
            status: 'online'
        });

        const currentTime = getJakartaTime();
        const totalUsers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

        // Startup information
        console.log('\x1b[36m%s\x1b[0m', '══════════════════════════════════════');
        console.log('\x1b[32m%s\x1b[0m', '✅ Bot is now online!');
        console.log('\x1b[33m%s\x1b[0m', `📡 Connected as: ${client.user.tag}`);
        console.log('\x1b[33m%s\x1b[0m', `👥 Serving: ${client.guilds.cache.size} servers`);
        console.log('\x1b[33m%s\x1b[0m', `👤 Users: ${totalUsers} users`);
        console.log('\x1b[33m%s\x1b[0m', `⌚ Current Time (UTC+7): ${currentTime}`);
        console.log('\x1b[33m%s\x1b[0m', `🤖 Bot Version: 1.0.0`);
        console.log('\x1b[33m%s\x1b[0m', `📋 Commands Loaded: ${client.commands.size}`);
        console.log('\x1b[36m%s\x1b[0m', '══════════════════════════════════════');

        // Log startup to logger
        await Logger.log('SYSTEM', {
    message: [
        '🚀 Bot has started up successfully!',
        `📡 Connected as: ${client.user.tag}`,
        `👥 Servers: ${client.guilds.cache.size}`,
        `👤 Users: ${totalUsers}`,
        `📋 Commands: ${client.commands.size}`,
        `⌚ Startup Time (UTC+7): ${currentTime}`,
        `👨‍💻 Started by: Catyro`
    ].join('\n'),
    userId: client.user.id,
    timestamp: currentTime
});

// Deploy commands saat startup
const deployCommands = async () => {
    try {
        console.log('\x1b[33m%s\x1b[0m', '🔄 Deploying slash commands...');
        
        const commands = [];
        const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const command = require(`./commands/${file}`);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
                console.log(`📥 Loaded command: ${command.data.name}`);
            }
        }

        const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);

        await rest.put(
            Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, config.DISCORD_GUILD_ID),
            { body: commands },
        );

        console.log('\x1b[32m%s\x1b[0m', '✅ Successfully deployed slash commands!');
        
        // Log successful deployment
        await Logger.log('SYSTEM', {
            message: `🔄 Deployed ${commands.length} slash commands successfully!`,
            timestamp: currentTime
        });

    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', '❌ Error deploying slash commands:', error);
        await Logger.log('ERROR', {
            type: 'DEPLOY_COMMANDS',
            error: error.message,
            timestamp: currentTime
        });
    }
};

// Execute command deployment
await deployCommands();

// Log to console
console.log('\x1b[32m%s\x1b[0m', '✨ All systems operational!');

// Log detailed server information
client.guilds.cache.forEach(guild => {
    console.log('\x1b[34m%s\x1b[0m', `📌 Connected to server: ${guild.name} (${guild.id})`);
    console.log('\x1b[34m%s\x1b[0m', `   ├ Members: ${guild.memberCount}`);
    console.log('\x1b[34m%s\x1b[0m', `   ├ Channels: ${guild.channels.cache.size}`);
    console.log('\x1b[34m%s\x1b[0m', `   └ Roles: ${guild.roles.cache.size}`);
});

console.log('\x1b[36m%s\x1b[0m', '══════════════════════════════════════');

    } catch (error) {
        console.error('Error in ready event:', error);
        Logger.log('ERROR', {
            type: 'STARTUP_ERROR',
            error: error.message,
            timestamp: currentTime
        });
    }
});

// Bot initialization
const initializeBot = async () => {
    try {
        validateConfig();
        console.log('🔄 Loading commands and events...');
        ensureDirectory(path.join(__dirname, 'commands'));
        ensureDirectory(path.join(__dirname, 'events'));
        await loadCommands();
        await loadEvents();
        await client.login(config.DISCORD_TOKEN);
    } catch (error) {
        console.error('❌ Error initializing bot:', error);
        process.exit(1);
    }
};

// Start the bot
initializeBot().catch(error => {
    console.error('Failed to initialize bot:', error);
    process.exit(1);
});
