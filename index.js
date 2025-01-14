const fs = require('fs');
const path = require('path');
const { 
    Client, 
    Collection, 
    GatewayIntentBits, 
    Partials,
    ActivityType,
    REST,
    Routes,
    Events,
    EmbedBuilder 
} = require('discord.js');
const Logger = require('./utils/logger');
const config = require('./config.js');
const RoleManager = require('./utils/role-manager');
const { version } = require('./package.json');
const moment = require('moment-timezone');

// Initialize Discord client with required intents
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.GuildMember
    ] 
});

// Initialize collections
client.commands = new Collection();
client.cooldowns = new Collection();

// Function to get Jakarta time
const getJakartaTime = () => {
    return moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');
};

// Load commands
const loadCommands = async () => {
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`📥 Loaded command: ${command.data.name}`);
        } else {
            console.log(`⚠️ Command at ${filePath} is missing required properties!`);
        }
    }
};

// Load events
const loadEvents = async () => {
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
};

// Register slash commands
const registerCommands = async () => {
    try {
        const commands = [];
        client.commands.forEach(command => {
            commands.push(command.data.toJSON());
        });

        const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);
        
        console.log('🔄 Started refreshing application (/) commands...');
        
        await rest.put(
            Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, config.DISCORD_GUILD_ID),
            { body: commands }
        );

        console.log('✅ Successfully reloaded application (/) commands!');
    } catch (error) {
        console.error('❌ Error refreshing commands:', error);
    }
};

// Initialize periodic tasks
const initPeriodicTasks = () => {
    // Check for expired boosts every hour
    setInterval(async () => {
        try {
            await checkExpiredBoosts();
        } catch (error) {
            console.error('Error checking expired boosts:', error);
            await Logger.log('ERROR', {
                type: 'BOOST_CHECK',
                error: error.message,
                timestamp: getJakartaTime()
            });
        }
    }, config.COOLDOWNS.BOOST_CHECK);

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
    }, 24 * 60 * 60 * 1000);
};

// Check expired boosts function
const checkExpiredBoosts = async () => {
    const guilds = client.guilds.cache;
    
    for (const [, guild] of guilds) {
        try {
            const members = await guild.members.fetch();
            
            for (const [, member] of members) {
                if (member.premiumSince) continue;

                const userRoles = await RoleManager.getUserRoles(member.id);
                if (!userRoles.length) continue;

                for (const roleData of userRoles) {
                    try {
                        const role = guild.roles.cache.get(roleData.roleId);
                        if (!role) continue;

                        const targetMember = await guild.members.fetch(roleData.targetId);
                        if (targetMember) {
                            await targetMember.roles.remove(role);
                        }

                        await role.delete('Boost expired - Automatic cleanup');

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

                await RoleManager.clearUserRoles(member.id);

                try {
                    await member.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor(config.EMBED_COLORS.ERROR)
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
};

// Initialize bot
const initBot = async () => {
    try {
        console.log('🔄 Starting bot initialization...');
        
        // Load commands and events
        await loadCommands();
        await loadEvents();
        
        // Login to Discord
        await client.login(config.DISCORD_TOKEN);
        
        // Register commands after bot is ready
        client.once(Events.ClientReady, async () => {
            await registerCommands();
            initPeriodicTasks();
            
            console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                     Custom Role Bot is Online!                     ║
╠═══════════════════════════════════════════════════════════════════╣
║ Bot Information:                                                   ║
║ • Name: ${client.user.tag}                                        
║ • Version: ${version}                                             
║ • Commands: ${client.commands.size}                               
║ • Time: ${getJakartaTime()}                                       
║ • Developer: Catyro                                               
╚═══════════════════════════════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('Fatal error during initialization:', error);
        process.exit(1);
    }
};

// Start the bot
initBot();

// Handle process errors
process.on('unhandledRejection', async (error) => {
    console.error('Unhandled promise rejection:', error);
    await Logger.log('ERROR', {
        type: 'UNHANDLED_REJECTION',
        error: error.message,
        stack: error.stack,
        timestamp: getJakartaTime()
    });
});

process.on('uncaughtException', async (error) => {
    console.error('Uncaught exception:', error);
    await Logger.log('ERROR', {
        type: 'UNCAUGHT_EXCEPTION',
        error: error.message,
        stack: error.stack,
        timestamp: getJakartaTime()
    });
    process.exit(1);
});