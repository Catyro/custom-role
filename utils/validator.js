const { Collection } = require('discord.js');

class Validator {
    static cooldowns = new Collection();

    static isValidHexColor(color) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
    }

    static async isValidImage(attachment) {
        if (!attachment) return false;
        
        const validFormats = ['image/png', 'image/jpeg', 'image/jpg'];
        const maxSize = 256 * 1024; // 256KB

        return validFormats.includes(attachment.contentType) && attachment.size <= maxSize;
    }

    static checkCooldown(userId, commandName, cooldownAmount = 300000) { // 5 minutes default
        if (!this.cooldowns.has(commandName)) {
            this.cooldowns.set(commandName, new Collection());
        }

        const now = Date.now();
        const timestamps = this.cooldowns.get(commandName);
        const cooldownTime = cooldownAmount;

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
}

module.exports = Validator;