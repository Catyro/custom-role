const { EmbedBuilder } = require('discord.js');
const TimeFormatter = require('./time-formatter');

class CustomEmbedBuilder extends EmbedBuilder {
    constructor() {
        super();
        this.setTimestamp()
            .setFooter({ 
                text: TimeFormatter.formatToJakarta(new Date()).full 
            });
    }

    /**
     * Sets a custom embed with title, description, and color
     * @param {string} emoji - Emoji untuk title
     * @param {string} title - Judul embed
     * @param {string} description - Deskripsi embed
     * @param {number} color - Warna embed (hex)
     */
    setCustom(emoji, title, description, color = 0x2B2D31) {
        return this.setTitle(`${emoji} ${title}`)
            .setDescription(description)
            .setColor(color);
    }

    /**
     * Sets a success embed
     * @param {string} title - Judul embed
     * @param {string} description - Deskripsi embed
     */
    setSuccess(title, description) {
        return this.setCustom('✅', title, description, 0x57F287);
    }

    /**
     * Sets an error embed
     * @param {string} title - Judul embed
     * @param {string} description - Deskripsi embed
     */
    setError(title, description) {
        return this.setCustom('❌', title, description, 0xED4245);
    }

    /**
     * Sets a warning embed
     * @param {string} title - Judul embed
     * @param {string} description - Deskripsi embed
     */
    setWarning(title, description) {
        return this.setCustom('⚠️', title, description, 0xFEE75C);
    }

    /**
     * Sets an info embed
     * @param {string} title - Judul embed
     * @param {string} description - Deskripsi embed
     */
    setInfo(title, description) {
        return this.setCustom('ℹ️', title, description, 0x5865F2);
    }

    /**
     * Sets a test role embed
     * @param {string} title - Judul embed
     * @param {string} description - Deskripsi embed
     */
    setTestRole(title, description) {
        return this.setCustom('🎯', title, description, 0x7289DA);
    }

    /**
     * Sets a boost embed
     * @param {string} title - Judul embed
     * @param {string} description - Deskripsi embed
     */
    setBoost(title, description) {
        return this.setCustom('🚀', title, description, 0xF47FFF);
    }

    /**
     * Sets a logs embed
     * @param {string} title - Judul embed
     * @param {string} description - Deskripsi embed
     */
    setLogs(title, description) {
        return this.setCustom('📝', title, description, 0x2B2D31);
    }

    /**
     * Sets a settings embed
     * @param {string} title - Judul embed
     * @param {string} description - Deskripsi embed
     */
    setSettings(title, description) {
        return this.setCustom('⚙️', title, description, 0x5865F2);
    }

    /**
     * Sets a role list embed
     * @param {string} title - Judul embed
     * @param {string} description - Deskripsi embed
     */
    setRoleList(title, description) {
        return this.setCustom('👥', title, description, 0x5865F2);
    }

    /**
     * Sets a leaderboard embed
     * @param {string} title - Judul embed
     * @param {string} description - Deskripsi embed
     */
    setLeaderboard(title, description) {
        return this.setCustom('🏆', title, description, 0xF47FFF);
    }

    /**
     * Adds a duration field to the embed
     * @param {number} milliseconds - Duration in milliseconds
     * @param {boolean} inline - Whether the field should be inline
     */
    addDurationField(milliseconds, inline = true) {
        return this.addFields({
            name: '⏱️ Durasi',
            value: TimeFormatter.formatDuration(milliseconds),
            inline
        });
    }

    /**
     * Adds a remaining time field to the embed
     * @param {Date} endTime - End time of the duration
     * @param {boolean} inline - Whether the field should be inline
     */
    addRemainingTimeField(endTime, inline = true) {
        return this.addFields({
            name: '⏳ Sisa Waktu',
            value: TimeFormatter.getRemainingTime(endTime),
            inline
        });
    }
}

module.exports = CustomEmbedBuilder;
