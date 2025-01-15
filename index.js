const { 
    Client, 
    Collection, 
    GatewayIntentBits, 
    Partials,
    Events
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const Logger = require('./utils/logger');

// Create client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.GuildMember,
        Partials.User
    ]
});

// Create collections
client.commands = new Collection();
client.cooldowns = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`[✓] Loaded command: ${command.data.name}`);
    } else {
        console.log(`[✗] Command at ${filePath} missing required "data" or "execute" property.`);
    }
}

// Load events
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
    console.log(`[✓] Loaded event: ${event.name}`);
}

// Handle interactions
client.on(Events.InteractionCreate, async interaction => {
    try {
        // Handle commands
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            // Check cooldowns
            const { cooldowns } = client;
            if (!cooldowns.has(command.data.name)) {
                cooldowns.set(command.data.name, new Collection());
            }

            const now = Date.now();
            const timestamps = cooldowns.get(command.data.name);
            const defaultCooldownDuration = 3; // 3 seconds
            const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1000;

            if (timestamps.has(interaction.user.id)) {
                const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

                if (now < expirationTime) {
                    const expiredTimestamp = Math.round(expirationTime / 1000);
                    return interaction.reply({ 
                        content: `Please wait <t:${expiredTimestamp}:R> before using \`/${command.data.name}\` again.`,
                        ephemeral: true 
                    });
                }
            }

            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

            // Execute command
            await command.execute(interaction);

        } else if (interaction.isModalSubmit()) {
            // Handle modal submissions
            const modalHandler = require('./events/modal-submit');
            await modalHandler.execute(interaction);

        } else if (interaction.isButton()) {
            // Handle button interactions
            const buttonHandler = require('./events/button-interaction');
            await buttonHandler.execute(interaction);
        }

    } catch (error) {
        console.error('Error handling interaction:', error);

        const errorMessage = {
            content: 'There was an error while executing this command!',
            ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }

        await Logger.log('ERROR', {
            guildId: interaction.guild?.id,
            type: 'INTERACTION_ERROR',
            error: error.message,
            userId: 'Catyro',
            timestamp: '2025-01-15 10:28:54'
        });
    }
});

// Handle process errors
process.on('unhandledRejection', async error => {
    console.error('Unhandled promise rejection:', error);
    await Logger.log('ERROR', {
        type: 'UNHANDLED_REJECTION',
        error: error.message,
        timestamp: '2025-01-15 10:28:54'
    });
});

process.on('uncaughtException', async error => {
    console.error('Uncaught exception:', error);
    await Logger.log('ERROR', {
        type: 'UNCAUGHT_EXCEPTION',
        error: error.message,
        timestamp: '2025-01-15 10:28:54'
    });
    process.exit(1);
});

// Ready event
// Ready event
client.once(Events.ClientReady, async () => {
    // ASCII Art Banner
    console.log('\n' + [
        '╔═══════════════════════════════════════════════════════════════╗',
        '║                                                               ║',
        '║     ██████╗ ██╗   ██╗███████╗████████╗ ██████╗ ███╗   ███╗    ║',
        '║    ██╔════╝ ██║   ██║██╔════╝╚══██╔══╝██╔═══██╗████╗ ████║    ║',
        '║    ██║      ██║   ██║███████╗   ██║   ██║   ██║██╔████╔██║    ║',
        '║    ██║      ██║   ██║╚════██║   ██║   ██║   ██║██║╚██╔╝██║    ║',
        '║    ╚██████╗ ╚██████╔╝███████║   ██║   ╚██████╔╝██║ ╚═╝ ██║    ║',
        '║     ╚═════╝  ╚═════╝ ╚══════╝   ╚═╝    ╚═════╝ ╚═╝     ╚═╝    ║',
        '║                                                               ║',
        '║                    ██████╗  ██████╗ ██╗     ███████╗          ║',
        '║                    ██╔══██╗██╔═══██╗██║     ██╔════╝          ║',
        '║                    ██████╔╝██║   ██║██║     █████╗            ║',
        '║                    ██╔══██╗██║   ██║██║     ██╔══╝            ║',
        '║                    ██║  ██║╚██████╔╝███████╗███████╗          ║',
        '║                    ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚══════╝          ║',
        '║                                                               ║',
        '╚═══════════════════════════════════════════════════════════════╝',
    ].join('\n') + '\n');

    // Bot Information
    const botInfo = [
        `[📡] Gateway    : Connected as ${client.user.tag}`,
        `[💓] Heartbeat  : ${client.ws.ping}ms`,
        `[🏠] Guilds     : ${client.guilds.cache.size} servers`,
        `[👥] Users      : ${client.users.cache.size} users`,
        `[💬] Channels   : ${client.channels.cache.size} channels`,
        `[⌚] Time       : ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}`,
        `[🤖] Bot Status : Online and ready!`,
        '\n[✨] Custom Role Bot is now online and ready to serve!'
    ];

    console.log(botInfo.join('\n'));
    
    // Set bot presence
    client.user.setPresence({
        activities: [{ 
            name: 'with custom roles ✨',
            type: 2 // "Listening to"
        }],
        status: 'online'
    });

    // Log startup
    await Logger.log('BOT_READY', {
        type: 'BOT_START',
        botTag: client.user.tag,
        guildCount: client.guilds.cache.size,
        userCount: client.users.cache.size,
        channelCount: client.channels.cache.size,
        ping: client.ws.ping,
        timestamp: '2025-01-15 10:32:52',
        startupBy: 'Catyro'
    });
});
// Login
client.login(process.env.TOKEN);
