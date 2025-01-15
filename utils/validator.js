const moment = require('moment');

class Validator {
    /**
     * Validates a hex color code
     * @param {string} color - The color code to validate
     * @returns {boolean|string} False if invalid, normalized color if valid
     */
    static validateColor(color) {
        // If it's a hex code
        if (color.startsWith('#')) {
            const normalized = color.toUpperCase();
            return /^#[0-9A-F]{6}$/i.test(normalized) ? normalized : false;
        }

        // Basic color names
        const basicColors = {
            'RED': '#FF0000',
            'GREEN': '#00FF00',
            'BLUE': '#0000FF',
            'YELLOW': '#FFFF00',
            'PURPLE': '#800080',
            'ORANGE': '#FFA500',
            'BLACK': '#000000',
            'WHITE': '#FFFFFF',
            'PINK': '#FFC0CB',
            'CYAN': '#00FFFF',
            'BROWN': '#A52A2A',
            'GRAY': '#808080',
            'LIME': '#00FF00',
            'MAGENTA': '#FF00FF',
            'GOLD': '#FFD700'
        };

        const upperColor = color.toUpperCase();
        return basicColors[upperColor] || false;
    }

    /**
     * Validates a role name
     * @param {string} name - The role name to validate
     * @returns {Object} Validation result with status and message
     */
    static validateRoleName(name) {
        const result = {
            isValid: false,
            message: ''
        };

        if (!name || typeof name !== 'string') {
            result.message = 'Nama role harus berupa text.';
            return result;
        }

        if (name.length < 2 || name.length > 100) {
            result.message = 'Nama role harus antara 2-100 karakter.';
            return result;
        }

        // Blacklisted characters
        const blacklist = /[@#%^*()=+[\]{}"'<>~|]/;
        if (blacklist.test(name)) {
            result.message = 'Nama role mengandung karakter yang tidak diizinkan.';
            return result;
        }

        // Blacklisted words
        const blacklistedWords = ['admin', 'mod', 'moderator', 'owner', 'staff', 'bot', 'webhook', 'system', 'everyone', 'here', 'kontol', 'memek', 'yatim', 'nazi', 'SERVANT', 'servant', 'SKIVY', 'skivy'];
        
        if (blacklistedWords.some(word => name.toLowerCase().includes(word))) {
            result.message = 'Nama role mengandung kata yang tidak diizinkan.';
            return result;
        }

        result.isValid = true;
        return result;
    }

    /**
     * Validates an icon URL
     * @param {string} url - The URL to validate
     * @returns {boolean} Whether the URL is valid
     */
    static validateIconUrl(url) {
        if (!url || typeof url !== 'string') return false;

        // Check URL format
        try {
            new URL(url);
        } catch {
            return false;
        }

        // Check file extension
        const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
        const hasValidExtension = validExtensions.some(ext => 
            url.toLowerCase().endsWith(ext)
        );

        return hasValidExtension;
    }

    /**
     * Validates user permissions
     * @param {GuildMember} member - The member to check
     * @param {Array<string>} requiredPermissions - Required permissions
     * @returns {Object} Validation result with status and missing permissions
     */
    static validatePermissions(member, requiredPermissions) {
        const result = {
            hasPermission: true,
            missingPermissions: []
        };

        if (!member || !requiredPermissions) {
            result.hasPermission = false;
            return result;
        }

        for (const permission of requiredPermissions) {
            if (!member.permissions.has(permission)) {
                result.hasPermission = false;
                result.missingPermissions.push(permission);
            }
        }

        return result;
    }

    /**
     * Validates channel permissions for bot
     * @param {GuildChannel} channel - The channel to check
     * @param {ClientUser} bot - The bot client user
     * @returns {Object} Validation result with status and missing permissions
     */
    static validateChannelPermissions(channel, bot) {
        const requiredPermissions = [
            'ViewChannel',
            'SendMessages',
            'EmbedLinks',
            'AttachFiles',
            'ReadMessageHistory'
        ];

        const result = {
            hasPermission: true,
            missingPermissions: []
        };

        const permissions = channel.permissionsFor(bot);
        if (!permissions) {
            result.hasPermission = false;
            return result;
        }

        for (const permission of requiredPermissions) {
            if (!permissions.has(permission)) {
                result.hasPermission = false;
                result.missingPermissions.push(permission);
            }
        }

        return result;
    }

    /**
     * Validates a duration string (e.g., "2m", "1h")
     * @param {string} duration - Duration string to validate
     * @returns {Object} Validation result with milliseconds if valid
     */
    static validateDuration(duration) {
        const result = {
            isValid: false,
            milliseconds: 0,
            message: ''
        };

        if (!duration || typeof duration !== 'string') {
            result.message = 'Durasi harus berupa text.';
            return result;
        }

        const match = duration.match(/^(\d+)(m|h|d)$/);
        if (!match) {
            result.message = 'Format durasi tidak valid. Gunakan format: 2m, 1h, atau 1d';
            return result;
        }

        const value = parseInt(match[1]);
        const unit = match[2];

        if (value <= 0) {
            result.message = 'Durasi harus lebih dari 0.';
            return result;
        }

        const multipliers = {
            'm': 60 * 1000,        // minutes to milliseconds
            'h': 60 * 60 * 1000,   // hours to milliseconds
            'd': 24 * 60 * 60 * 1000 // days to milliseconds
        };

        result.milliseconds = value * multipliers[unit];
        result.isValid = true;

        // Add limits
        const maxDurations = {
            'm': 60,  // max 60 minutes
            'h': 24,  // max 24 hours
            'd': 7    // max 7 days
        };

        if (value > maxDurations[unit]) {
            result.isValid = false;
            result.message = `Maksimal durasi untuk ${unit} adalah ${maxDurations[unit]}${unit}`;
            return result;
        }

        return result;
    }

    /**
     * Validates and formats a timestamp
     * @param {string|Date} timestamp - Timestamp to validate
     * @returns {string|false} Formatted timestamp if valid, false if invalid
     */
    static validateTimestamp(timestamp) {
        try {
            const date = moment(timestamp);
            if (!date.isValid()) return false;
            return date.utc().format('YYYY-MM-DD HH:mm:ss');
        } catch {
            return false;
        }
    }

    /**
     * Validates a user ID or mention
     * @param {string} input - User input to validate
     * @returns {string|false} Clean user ID if valid, false if invalid
     */
    static validateUserInput(input) {
        if (!input || typeof input !== 'string') return false;

        // Remove mention formatting
        const cleanId = input.replace(/[<@!>]/g, '');

        // Check if it's a valid Discord ID
        if (!/^\d{17,19}$/.test(cleanId)) return false;

        return cleanId;
    }
}

module.exports = Validator;
