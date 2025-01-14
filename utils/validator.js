const fetch = require('node-fetch');
const config = require('../config');
const Logger = require('./logger');
const moment = require('moment-timezone');

class Validator {
    /**
     * Validates role name
     * @param {string} name Role name to validate
     * @returns {boolean}
     */
    static isValidRoleName(name) {
        if (!name || typeof name !== 'string') return false;
        
        // Check length
        if (name.length < config.ROLE_LIMITS.MIN_NAME_LENGTH || 
            name.length > config.ROLE_LIMITS.MAX_NAME_LENGTH) {
            return false;
        }

        // Check for invalid characters
        const invalidChars = /[^\w\s-]/g;
        if (invalidChars.test(name)) {
            return false;
        }

        return true;
    }

    /**
     * Validates hex color code
     * @param {string} color Hex color code to validate
     * @returns {boolean}
     */
    static isValidHexColor(color) {
        if (!color || typeof color !== 'string') return false;
        
        // Check hex color format (#RGB or #RRGGBB)
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
    }

    /**
     * Validates image URL and checks size
     * @param {string} url Image URL to validate
     * @returns {Promise<boolean>}
     */
    static async isValidImageUrl(url) {
        try {
            const response = await fetch(url);
            
            // Check if response is ok
            if (!response.ok) return false;

            // Check content type
            const contentType = response.headers.get('content-type');
            if (!config.ROLE_LIMITS.ALLOWED_IMAGE_TYPES.includes(contentType)) {
                return false;
            }

            // Check file size
            const contentLength = response.headers.get('content-length');
            if (parseInt(contentLength) > config.ROLE_LIMITS.MAX_ICON_SIZE) {
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error validating image URL:', error);
            await Logger.log('ERROR', {
                type: 'IMAGE_VALIDATION',
                error: error.message,
                url: url,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });
            return false;
        }
    }

    /**
     * Gets image buffer from URL
     * @param {string} url Image URL
     * @returns {Promise<Buffer|null>}
     */
    static async getImageBuffer(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) return null;

            const buffer = await response.buffer();
            return buffer;
        } catch (error) {
            console.error('Error getting image buffer:', error);
            await Logger.log('ERROR', {
                type: 'IMAGE_BUFFER',
                error: error.message,
                url: url,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });
            return null;
        }
    }

    /**
     * Validates user permissions for role management
     * @param {Object} member Guild member
     * @param {string} action Action being performed
     * @returns {boolean}
     */
    static hasRolePermissions(member, action) {
        // Check if user is server booster
        if (!member.premiumSince) {
            return false;
        }

        // Check role limit
        if (action === 'create') {
            const userRoles = member.roles.cache.size;
            if (userRoles >= config.ROLE_LIMITS.MAX_ROLES_PER_USER) {
                return false;
            }
        }

        return true;
    }

    /**
     * Validates cooldown for user actions
     * @param {string} userId User ID
     * @param {string} action Action type
     * @param {Map} cooldowns Cooldown collection
     * @returns {number} Time remaining in seconds, 0 if no cooldown
     */
    static getRemainingCooldown(userId, action, cooldowns) {
        const key = `${userId}-${action}`;
        const cooldownAmount = config.COOLDOWNS[action] || config.COOLDOWNS.default;
        
        if (cooldowns.has(key)) {
            const expirationTime = cooldowns.get(key);
            const now = Date.now();
            
            if (now < expirationTime) {
                return Math.ceil((expirationTime - now) / 1000);
            }
        }

        cooldowns.set(key, Date.now() + cooldownAmount);
        return 0;
    }

    /**
     * Validates guild limits
     * @param {Object} guild Discord guild
     * @returns {boolean}
     */
    static isWithinGuildLimits(guild) {
        const customRoles = guild.roles.cache.filter(role => 
            role.name.startsWith('[Custom]')
        );

        return customRoles.size < config.ROLE_LIMITS.MAX_ROLES_PER_GUILD;
    }
}

module.exports = Validator;