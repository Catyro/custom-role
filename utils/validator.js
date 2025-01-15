const moment = require('moment');

class Validator {
    /**
     * Validates a hex color code or basic color name
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

        // Blacklisted words (disesuaikan dengan kebutuhan server)
        const blacklistedWords = ['admin', 'mod', 'moderator', 'owner', 'staff', 'bot', 'webhook'];
        
        if (blacklistedWords.some(word => name.toLowerCase().includes(word))) {
            result.message = 'Nama role mengandung kata yang tidak diizinkan.';
            return result;
        }

        result.isValid = true;
        return result;
    }

    /**
     * Validates duration input for test role
     * @param {string} duration - Duration string (e.g., "30s", "5m", "2h")
     * @returns {Object} Validation result with milliseconds if valid
     */
    static validateDuration(duration) {
        const result = {
            isValid: false,
            milliseconds: 0,
            message: ''
        };

        // Default duration: 1 minute
        if (!duration) {
            result.isValid = true;
            result.milliseconds = 60 * 1000;
            return result;
        }

        if (typeof duration !== 'string') {
            result.message = 'Durasi harus berupa text.';
            return result;
        }

        const match = duration.match(/^(\d+)(s|m|h)$/);
        if (!match) {
            result.message = 'Format durasi tidak valid. Gunakan format: 30s, 45m, atau 2h';
            return result;
        }

        const value = parseInt(match[1]);
        const unit = match[2];

        if (value <= 0) {
            result.message = 'Durasi harus lebih dari 0.';
            return result;
        }

        const maxDurations = {
            's': 60,  // max 60 seconds
            'm': 60,  // max 60 minutes
            'h': 24   // max 24 hours
        };

        if (value > maxDurations[unit]) {
            result.isValid = false;
            result.message = `Maksimal durasi untuk ${unit} adalah ${maxDurations[unit]}${unit}`;
            return result;
        }

        const multipliers = {
            's': 1000,
            'm': 60 * 1000,
            'h': 60 * 60 * 1000
        };

        result.milliseconds = value * multipliers[unit];
        result.isValid = true;
        return result;
    }

    /**
     * Validates user input (ID, mention, or username)
     * @param {Client} client - Discord client instance
     * @param {string} input - User input to validate
     * @returns {string|false} Clean user ID if valid, false if invalid
     */
    static async validateUserInput(client, input) {
        if (!input || typeof input !== 'string') return false;

        // Remove mention formatting
        const cleanId = input.replace(/[<@!>]/g, '');

        // Check if it's a valid Discord ID
        if (/^\d{17,19}$/.test(cleanId)) {
            try {
                await client.users.fetch(cleanId);
                return cleanId;
            } catch {
                return false;
            }
        }

        return false;
    }

    /**
     * Validates an icon URL and file size
     * @param {string} url - The URL to validate
     * @returns {Promise<boolean>} Whether the URL and file size are valid
     */
    static async validateIconUrl(url) {
        if (!url || typeof url !== 'string') return false;

        try {
            const urlObj = new URL(url);
            
            // Check file extension
            const validExtensions = ['.png', '.jpg', '.jpeg', '.gif'];
            if (!validExtensions.some(ext => urlObj.pathname.toLowerCase().endsWith(ext))) {
                return false;
            }

            // Check file size (max 256KB)
            const response = await fetch(url, { method: 'HEAD' });
            const size = response.headers.get('content-length');
            if (size > 256 * 1024) { // 256KB in bytes
                return false;
            }

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validates channel permissions for bot
     * @param {GuildChannel} channel - The channel to check
     * @param {ClientUser} bot - The bot client user
     * @returns {Object} Validation result
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
}

module.exports = Validator;