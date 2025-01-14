require('dotenv').config();
const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    // Bot Configuration (mengambil dari .env)
    DISCORD_TOKEN: process.env.DISCORD_TOKEN,
    DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
    DISCORD_GUILD_ID: process.env.DISCORD_GUILD_ID,
    
    // Bot Settings
    BOT_PREFIX: '!',
    TIMEZONE: process.env.TZ || 'Asia/Jakarta',
    
    // Embed Colors
    EMBED_COLORS: {
        DEFAULT: '#0099ff',
        ERROR: '#ff0000',
        SUCCESS: '#00ff00',
        WARNING: '#ffff00',
        INFO: '#00ffff'
    },

    // Logging Configuration    
    LOG_CHANNEL: process.env.LOG_CHANNEL || '',
    DEBUG_MODE: process.env.NODE_ENV !== 'production',

    // Bot Required Permissions
    BOT_PERMISSIONS: [
        PermissionFlagsBits.ManageRoles,
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.UseExternalEmojis,
        PermissionFlagsBits.AddReactions
    ],

    // Custom Role Settings
    ROLE_LIMITS: {
        MAX_ROLES_PER_USER: 3,
        MAX_ROLES_PER_GUILD: 50,
        MAX_NAME_LENGTH: 100,
        MAX_ICON_SIZE: 256 * 1024, // 256KB in bytes
    },

    // Cooldown Settings (in milliseconds)
    COOLDOWNS: {
        CREATE_ROLE: 300000,  // 5 minutes
        EDIT_ROLE: 60000,     // 1 minute
        TEST_ROLE: 300000,    // 5 minutes
        default: 3000         // 3 seconds
    }
};