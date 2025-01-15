const { EmbedBuilder: DiscordEmbed } = require('discord.js');
const moment = require('moment');

class EmbedBuilder extends DiscordEmbed {
    constructor() {
        super();
        // Set default timestamp in UTC
        this.setTimestamp(moment.utc().toDate());
    }

    /**
     * Sets custom embed with emoji, title, and description
     * @param {string} emoji - Emoji for the title
     * @param {string} title - Title of the embed
     * @param {string} description - Description of the embed
     * @param {number} color - Color of the embed in hex
     * @returns {EmbedBuilder}
     */
    setCustom(emoji, title, description, color) {
        return this
            .setColor(color)
            .setTitle(`${emoji} ${title}`)
            .setDescription(description);
    }

    /**
     * Sets success embed
     * @param {string} title - Title of the embed
     * @param {string} description - Description of the embed
     * @returns {EmbedBuilder}
     */
    setSuccess(title, description) {
        return this.setCustom('✅', title, description, 0x00ff00);
    }

    /**
     * Sets error embed
     * @param {string} title - Title of the embed
     * @param {string} description - Description of the embed
     * @returns {EmbedBuilder}
     */
    setError(title, description) {
        return this.setCustom('❌', title, description, 0xff0000);
    }

    /**
     * Sets warning embed
     * @param {string} title - Title of the embed
     * @param {string} description - Description of the embed
     * @returns {EmbedBuilder}
     */
    setWarning(title, description) {
        return this.setCustom('⚠️', title, description, 0xffff00);
    }

    /**
     * Sets info embed
     * @param {string} title - Title of the embed
     * @param {string} description - Description of the embed
     * @returns {EmbedBuilder}
     */
    setInfo(title, description) {
        return this.setCustom('ℹ️', title, description, 0x0099ff);
    }

    /**
     * Sets loading embed
     * @param {string} title - Title of the embed
     * @param {string} description - Description of the embed
     * @returns {EmbedBuilder}
     */
    setLoading(title, description) {
        return this.setCustom('⏳', title, description, 0x7289da);
    }

    /**
     * Sets custom role embed
     * @param {string} title - Title of the embed
     * @param {string} description - Description of the embed
     * @returns {EmbedBuilder}
     */
    setCustomRole(title, description) {
        return this.setCustom('👑', title, description, 0xf47fff);
    }

    /**
     * Sets test role embed
     * @param {string} title - Title of the embed
     * @param {string} description - Description of the embed
     * @returns {EmbedBuilder}
     */
    setTestRole(title, description) {
        return this.setCustom('🎯', title, description, 0x7289da);
    }

    /**
     * Sets settings embed
     * @param {string} title - Title of the embed
     * @param {string} description - Description of the embed
     * @returns {EmbedBuilder}
     */
    setSettings(title, description) {
        return this.setCustom('⚙️', title, description, 0x007bff);
    }

    /**
     * Adds a timestamp footer
     * @param {string} text - Additional text for footer
     * @returns {EmbedBuilder}
     */
    setTimestampFooter(text = '') {
        const timestamp = moment.utc().format('YYYY-MM-DD HH:mm:ss');
        const footerText = text ? `${text} • ${timestamp}` : timestamp;
        return this.setFooter({ text: footerText });
    }

    /**
     * Sets author as Catyro
     * @param {boolean} withTimestamp - Whether to include timestamp
     * @returns {EmbedBuilder}
     */
    setAuthorAsCatyro(withTimestamp = true) {
        this.setAuthor({
            name: 'Catyro',
            iconURL: 'https://github.com/Catyro.png'
        });

        if (withTimestamp) {
            this.setTimestampFooter();
        }

        return this;
    }

    /**
     * Sets a field with inline formatting
     * @param {string} name - Name of the field
     * @param {string} value - Value of the field
     * @param {boolean} inline - Whether the field should be inline
     * @returns {EmbedBuilder}
     */
    addFormattedField(name, value, inline = true) {
        return this.addFields([{
            name: name,
            value: String(value),
            inline: inline
        }]);
    }

    /**
     * Sets multiple fields with consistent formatting
     * @param {Array<{name: string, value: string, inline?: boolean}>} fields 
     * @returns {EmbedBuilder}
     */
    addFormattedFields(fields) {
        return this.addFields(
            fields.map(({ name, value, inline = true }) => ({
                name: name,
                value: String(value),
                inline: inline
            }))
        );
    }
}

module.exports = EmbedBuilder;
