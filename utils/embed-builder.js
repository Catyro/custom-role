const { EmbedBuilder } = require('discord.js');
const config = require('../config');

class EmbedService {
    /**
     * Creates a standardized embed with optional parameters
     * @param {Object} options Embed options
     * @param {string} options.title Embed title
     * @param {string} options.description Embed description
     * @param {string} options.color Embed color (hex)
     * @param {Array} options.fields Array of fields
     * @param {Object} options.footer Footer object
     * @param {boolean} options.timestamp Include timestamp
     * @returns {EmbedBuilder}
     */
    static createEmbed({
        title = '',
        description = '',
        color = config.EMBED_COLORS.DEFAULT,
        fields = [],
        footer = null,
        timestamp = false
    }) {
        const embed = new EmbedBuilder()
            .setColor(color);

        if (title) embed.setTitle(title);
        if (description) embed.setDescription(description);
        if (fields.length > 0) embed.addFields(fields);
        if (footer) embed.setFooter(footer);
        if (timestamp) embed.setTimestamp();

        return embed;
    }

    /**
     * Creates a success embed
     * @param {string} message Success message
     * @returns {EmbedBuilder}
     */
    static success(message) {
        return this.createEmbed({
            title: '✅ Success',
            description: message,
            color: config.EMBED_COLORS.SUCCESS
        });
    }

    /**
     * Creates an error embed
     * @param {string} message Error message
     * @returns {EmbedBuilder}
     */
    static error(message) {
        return this.createEmbed({
            title: '❌ Error',
            description: message,
            color: config.EMBED_COLORS.ERROR
        });
    }

    /**
     * Creates a warning embed
     * @param {string} message Warning message
     * @returns {EmbedBuilder}
     */
    static warning(message) {
        return this.createEmbed({
            title: '⚠️ Warning',
            description: message,
            color: config.EMBED_COLORS.WARNING
        });
    }

    /**
     * Creates an info embed
     * @param {string} message Info message
     * @returns {EmbedBuilder}
     */
    static info(message) {
        return this.createEmbed({
            title: 'ℹ️ Information',
            description: message,
            color: config.EMBED_COLORS.INFO
        });
    }
}

module.exports = EmbedService;