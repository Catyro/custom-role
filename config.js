module.exports = {
    TOKEN: process.env.TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    DEVELOPER: 'Catyro',
    
    // Timezone settings
    TIMEZONE: 'Asia/Jakarta',
    TIME_FORMAT: 'DD/MM/YYYY HH:mm:ss',
    
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
        TEST_ROLE: 300000     // 5 minutes
    },
    
    // Embed colors
    EMBED_COLORS: {
        PRIMARY: '#007bff',    // Biru
        SUCCESS: '#28a745',    // Hijau
        ERROR: '#dc3545',      // Merah
        WARNING: '#ffc107',    // Kuning
        INFO: '#17a2b8',       // Biru Muda
        BOOST: '#ff73fa'       // Pink Discord Nitro
    },

    // Emoji custom
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
        CLOSE: '❌'
    }
};