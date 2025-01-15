const moment = require('moment-timezone');

class Validator {
    /**
     * Validates a hex color code
     * @param {string} color - The color code to validate
     * @returns {boolean} Whether the color code is valid
     */
    static isValidColor(color) {
        return /^#[0-9A-F]{6}$/i.test(color);
    }

    /**
     * Validates a role name
     * @param {string} name - The role name to validate
     * @returns {boolean} Whether the role name is valid
     */
    static isValidRoleName(name) {
        // Role name should be 1-32 characters long and not contain certain special characters
        return name.length > 0 && 
               name.length <= 32 && 
               !/[@#%^*()=+[\]{}"'<>~|]/.test(name);
    }

    /**
     * Validates an image URL
     * @param {string} url - The URL to validate
     * @returns {boolean} Whether the URL is valid
     */
    static isValidImageUrl(url) {
        if (!url) return true; // Optional parameter
        try {
            const urlObj = new URL(url);
            return ['http:', 'https:'].includes(urlObj.protocol) &&
                   /\.(jpg|jpeg|png|gif|webp)$/i.test(urlObj.pathname);
        } catch {
            return false;
        }
    }

    /**
     * Validates role permissions
     * @param {bigint[]} permissions - Array of permission flags
     * @returns {boolean} Whether the permissions are valid
     */
    static isValidPermissions(permissions) {
        const restrictedPerms = [
            'ADMINISTRATOR',
            'KICK_MEMBERS',
            'BAN_MEMBERS',
            'MANAGE_CHANNELS',
            'MANAGE_GUILD',
            'MANAGE_ROLES',
            'MANAGE_WEBHOOKS',
            'MANAGE_MESSAGES',
            'MENTION_EVERYONE'
        ];

        return !permissions.some(perm => restrictedPerms.includes(perm));
    }

    /**
     * Validates if a channel can be used for logging
     * @param {TextChannel} channel - The channel to validate
     * @param {Client} bot - The bot client
     * @returns {boolean} Whether the channel is valid for logging
     */
    static async canUseChannel(channel, bot) {
        try {
            const permissions = channel.permissionsFor(bot.user);
            return permissions.has(['ViewChannel', 'SendMessages', 'EmbedLinks']);
        } catch {
            return false;
        }
    }

    /**
     * Format and validate timestamp
     * @param {Date|string|number} time - The time to format
     * @returns {string} Formatted timestamp
     */
    static formatTimestamp(time) {
        return moment(time).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');
    }
}

module.exports = Validator;
