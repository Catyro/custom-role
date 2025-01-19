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
require('dotenv').config();

// Create client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.GuildMember,
        Partials.User,
        Partials.ThreadMember
    ]
});

// Create collections
client.commands = new Collection();
client.cooldowns = new Collection();
client.buttons = new Collection();

// Load commands
const loadCommands = async () => {
    try {
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
    } catch (error) {
        console.error('Error loading commands:', error);
    }
};

// Load events
const loadEvents = async () => {
    try {
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
    } catch (error) {
        console.error('Error loading events:', error);
    }
};

// Handle interactions
const handleInteraction = async (interaction) => {
    try {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) {
                console.log(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}`);
                console.error(error);

                const errorMessage = {
                    content: 'Terjadi kesalahan saat menjalankan command ini.',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        } else if (interaction.isButton()) {
            // Handle button interactions
            const [buttonId] = interaction.customId.split('_');
            const button = client.buttons.get(buttonId);

            if (!button) return;

            try {
                await button.execute(interaction);
            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: 'Terjadi kesalahan saat memproses tombol ini.',
                    ephemeral: true
                });
            }
        } else if (interaction.isModalSubmit()) {
            // Handle modal submissions
            const modalHandler = require('./events/modal-submit');
            await modalHandler.execute(interaction);
        }
    } catch (error) {
        console.error('Error handling interaction:', error);
    }
};

// Initialize bot
const init = async () => {
    try {
        await loadCommands();
        await loadEvents();

        // Register interaction handler
        client.on(Events.InteractionCreate, handleInteraction);

        // Login to Discord
        await client.login(process.env.TOKEN);
    } catch (error) {
        console.error('Error initializing bot:', error);
    }
};

init();

// Handle process errors
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
    console.error('Uncaught exception:', error);
});

module.exports = client;
