const axios = require('axios');
const sharp = require('sharp');

const MAX_IMAGE_SIZE = 256 * 1024; // 256KB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

class Validator {
    static cooldowns = new Collection();
    static ROLE_NAME_MAX_LENGTH = 100;
    static BANNED_WORDS = ['admin', 'mod', 'moderator', 'owner', 'staff'];
    
    static isValidHexColor(color) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
    }

    static isValidRoleName(name) {
        if (!name || typeof name !== 'string') return false;
        if (name.length > this.ROLE_NAME_MAX_LENGTH) return false;
        
        // Check for banned words
        const lowerName = name.toLowerCase();
        if (this.BANNED_WORDS.some(word => lowerName.includes(word))) return false;
        
        // Allow only alphanumeric, spaces, and basic special characters
        return /^[\w\s\-\.]+$/i.test(name);
    }

    static async isValidImage(attachment) {
        if (!attachment) return false;
        
        const validFormats = ['image/png', 'image/jpeg', 'image/jpg'];
        const maxSize = 256 * 1024; // 256KB
        const minSize = 1024; // 1KB

        return validFormats.includes(attachment.contentType) && 
               attachment.size <= maxSize && 
               attachment.size >= minSize;
    }

    static checkCooldown(userId, commandName, cooldownAmount = 300000) {
        if (!this.cooldowns.has(commandName)) {
            this.cooldowns.set(commandName, new Collection());
        }

        const now = Date.now();
        const timestamps = this.cooldowns.get(commandName);
        const cooldownTime = cooldownAmount;

        // Cleanup old entries
        this.cleanupOldCooldowns(timestamps);

        if (timestamps.has(userId)) {
            const expirationTime = timestamps.get(userId) + cooldownTime;

            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return Math.round(timeLeft);
            }
        }

        timestamps.set(userId, now);
        setTimeout(() => timestamps.delete(userId), cooldownTime);
        return false;
    }

    static cleanupOldCooldowns(timestamps) {
        const now = Date.now();
        timestamps.forEach((timestamp, userId) => {
            if (now - timestamp > 3600000) { // Clean entries older than 1 hour
                timestamps.delete(userId);
            }
        });
    }

    static validateRolePermissions(permissions) {
        const dangerousPermissions = [
            'ADMINISTRATOR',
            'KICK_MEMBERS',
            'BAN_MEMBERS',
            'MANAGE_CHANNELS',
            'MANAGE_GUILD',
            'MANAGE_WEBHOOKS',
            'MANAGE_ROLES'
        ];

        return !permissions.some(perm => dangerousPermissions.includes(perm));
    }

    static sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        return input
            .replace(/[<>]/g, '') // Remove < and >
            .trim()
            .slice(0, this.ROLE_NAME_MAX_LENGTH);
    }
}

module.exports = Validator;