const fs = require('fs').promises;
const path = require('path');
const TimeFormatter = require('./time-formatter');
const CustomEmbedBuilder = require('./embed-builder');

class Logger {
    static #logPath = path.join(__dirname, '..', 'data', 'logs.json');
    static #configPath = path.join(__dirname, '..', 'data', 'config.json');

    /**
     * Gets a guild by its ID
     * @private
     * @param {string} guildId - The ID of the guild
     * @returns {Promise<Guild>} The guild object
     */
    static async #getGuild(guildId) {
        if (!guildId) return null;
        try {
            const client = require('../index.js').client;
            return await client.guilds.fetch(guildId);
        } catch (error) {
            console.error('Error fetching guild:', error);
            return null;
        }
    }

    /**
     * Logs an event to the logs file and channel if configured
     * @param {string} type - Type of log
     * @param {Object} data - Log data
     */
    static async log(type, data) {
        try {
            // Add timestamp if not present
            if (!data.timestamp) {
                data.timestamp = '2025-01-19 19:39:56';
            }

            // Load existing logs
            const logs = await this.#loadLogs();
            
            // Add new log
            logs.push({
                type,
                ...data,
                timestamp: data.timestamp,
                loggedBy: 'Caatyro'
            });

            // Save logs
            await fs.writeFile(this.#logPath, JSON.stringify(logs, null, 2));

            // Send to log channel if configured
            await this.sendToLogChannel(type, data);
        } catch (error) {
            console.error('Error logging:', error);
        }
    }

    /**
     * Sends a log to the configured log channel
     * @param {string} type - Type of log
     * @param {Object} data - Log data
     */
    static async sendToLogChannel(type, data) {
        try {
            const config = await this.#loadConfig();
            if (!config.logChannel) return;

            const guild = await this.#getGuild(data.guildId);
            if (!guild) return;

            const channel = await guild.channels.fetch(config.logChannel);
            if (!channel) return;

            const embed = new CustomEmbedBuilder()
                .setLogs(this.#getLogTitle(type), this.#formatLogData(type, data));

            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error sending to log channel:', error);
        }
    }

    /**
     * Sets the log channel for a guild
     * @param {string} guildId - Guild ID
     * @param {string} channelId - Channel ID
     */
    static async setLogChannel(guildId, channelId) {
        try {
            const config = await this.#loadConfig();
            config.logChannel = channelId;
            await fs.writeFile(this.#configPath, JSON.stringify(config, null, 2));
        } catch (error) {
            console.error('Error setting log channel:', error);
            throw error;
        }
    }

    /**
     * Gets logs for a guild
     * @param {string} guildId - Guild ID
     * @returns {Array} Array of logs
     */
    static async getLogs(guildId) {
        try {
            const logs = await this.#loadLogs();
            return logs.filter(log => log.guildId === guildId);
        } catch (error) {
            console.error('Error getting logs:', error);
            return [];
        }
    }

    /**
     * Loads logs from file
     * @private
     */
    static async #loadLogs() {
    try {
        const data = await fs.readFile(this.#logPath, 'utf8');
        const logs = JSON.parse(data);
        // Pastikan logs selalu array
        return Array.isArray(logs) ? logs : [];
    } catch (error) {
        // Jika file tidak ada, buat baru
        await fs.writeFile(this.#logPath, '[]', 'utf8').catch(() => {});
        return [];
    }
}

    /**
     * Loads config from file
     * @private
     */
    static async #loadConfig() {
        try {
            const data = await fs.readFile(this.#configPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return {};
        }
    }

    /**
     * Gets log title based on type
     * @private
     */
    static #getLogTitle(type) {
        const titles = {
            'TEST_ROLE_START': 'Test Role Dimulai',
            'TEST_ROLE_CREATE': 'Test Role Dibuat',
            'TEST_ROLE_EXPIRE': 'Test Role Berakhir',
            'TEST_ROLE_ERROR': 'Error Test Role',
            'ROLE_UPDATE': 'Role Diperbarui',
            'SETTINGS_UPDATE': 'Pengaturan Diperbarui',
            'BOT_STARTUP': 'Bot Started',
            'GUILD_INFO': 'Guild Information',
            'BOT_READY': 'Bot Ready',
            'ERROR': 'Error'
        };
        return titles[type] || 'Log';
    }

    /**
     * Formats log data for display
     * @private
     */
    static #formatLogData(type, data) {
        let formattedData = '';
        
        switch(type) {
            case 'TEST_ROLE_CREATE':
                formattedData = `👤 User: <@${data.targetId}>\n🎨 Role: <@&${data.roleId}>\n🎯 Warna: ${data.color}`;
                break;
            case 'TEST_ROLE_EXPIRE':
                formattedData = `👤 User: <@${data.userId}>\n🎨 Role: <@&${data.roleId}>`;
                break;
            case 'ROLE_UPDATE':
                formattedData = `🎨 Role: <@&${data.roleId}>\n👤 Diperbarui oleh: <@${data.updatedBy}>`;
                break;
            case 'BOT_STARTUP':
                formattedData = `🤖 Bot: ${data.botTag}\n📊 Servers: ${data.totalServers}\n👥 Users: ${data.totalUsers}\n⌚ Time: ${data.startupTime}`;
                break;
            case 'GUILD_INFO':
                formattedData = `🏠 Guild: ${data.name}\n👥 Members: ${data.members}\n💬 Channels: ${data.channels}\n👑 Roles: ${data.roles}`;
                break;
            case 'ERROR':
                formattedData = `❌ Error: ${data.error}\n📄 Type: ${data.type}`;
                break;
            default:
                formattedData = Object.entries(data)
                    .filter(([key]) => !['type', 'timestamp', 'guildId'].includes(key))
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('\n');
        }

        return formattedData + `\n\n⏰ Timestamp: ${data.timestamp}\n👨‍💻 Logged by: ${data.loggedBy || 'Caatyro'}`;
    }
}

module.exports = Logger;
