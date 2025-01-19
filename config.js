module.exports = {
    TOKEN: process.env.TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    DEVELOPER: 'Catyro',
    
    // Timezone settings
    TIMEZONE: 'Asia/Jakarta',
    TIME_FORMAT: 'YYYY-MM-DD HH:mm:ss',
    
    // Role limits
    ROLE_LIMITS: {
        MAX_ROLES_PER_USER: 1,
        MAX_ROLES_PER_GUILD: 50,
        MAX_NAME_LENGTH: 32,
        MAX_ICON_SIZE: 256000, // 256KB
        DEFAULT_TEST_DURATION: 300000 // 5 minutes
    },
    
    // Cooldowns (in milliseconds)
    COOLDOWNS: {
        CREATE_ROLE: 300000,  // 5 minutes
        EDIT_ROLE: 60000,     // 1 minute
        TEST_ROLE: 300000,    // 5 minutes
        BOOST_LEADERBOARD: 10000, // 10 seconds
        SETTINGS: 5000        // 5 seconds
    },
    
    // Embed colors
    EMBED_COLORS: {
        PRIMARY: '#F47FFF',    // Main Color
        SUCCESS: '#57F287',    // Green
        ERROR: '#ED4245',      // Red
        WARNING: '#FEE75C',    // Yellow
        INFO: '#5865F2',       // Blue
        BOOST: '#FF73FA'       // Discord Nitro Pink
    },

    // Custom Emojis
    EMOJIS: {
        SUCCESS: '✅',
        ERROR: '❌',
        WARNING: '⚠️',
        INFO: 'ℹ️',
        LOADING: '🔄',
        BOOST: '🚀',
        ROLE: '👑',
        SETTINGS: '⚙️',
        LOGS: '📜',
        CHANNEL: '📌',
        LIST: '📋',
        NEXT: '➡️',
        PREV: '⬅️',
        CLOSE: '❌',
        EDIT: '✏️',
        DELETE: '🗑️',
        COLOR: '🎨',
        ICON: '🖼️',
        TIME: '⏰',
        PREVIEW: '👀'
    },

    // Logger settings
    LOGGER: {
        enabled: true,
        logToFile: true,
        logToConsole: true,
        logToChannel: true,
        format: '[{timestamp}] [{type}] {message}'
    },

    // Command Permissions
    PERMISSIONS: {
        MANAGE_ROLES: true,
        VIEW_AUDIT_LOG: true,
        MANAGE_GUILD: true
    }
};
