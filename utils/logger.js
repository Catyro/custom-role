const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');

class Logger {
    constructor() {
        this.logsPath = path.join(__dirname, '../data/logs.json');
        this.maxLogs = 1000; // Maximum logs to keep per guild
    }

    /**
     * Initialize logger
     * @private
     */
    async init() {
        try {
            await fs.access(this.logsPath);
        } catch {
            // Create logs file if it doesn't exist
            await fs.writeFile(this.logsPath, JSON.stringify({}));
        }
    }

    /**
     * Get logs from file
     * @private
     * @returns {Promise<Object>} Logs object
     */
    async getLogs() {
        await this.init();
        const data = await fs.readFile(this.logsPath, 'utf8');
        return JSON.parse(data);
    }

    /**
     * Save logs to file
     * @private
     * @param {Object} logs - Logs object to save
     */
    async saveLogs(logs) {
        await fs.writeFile(this.logsPath, JSON.stringify(logs, null, 2));
    }

    /**
     * Add a log entry
     * @param {string} type - Type of log
     * @param {Object} data - Log data
     */
    async log(type, data) {
        try {
            const logs = await this.getLogs();
            const guildId = data.guildId || 'global';

            if (!logs[guildId]) {
                logs[guildId] = [];
            }

            // Create log entry
            const logEntry = {
                id: this.generateLogId(),
                type,
                ...data,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            };

            // Add new log
            logs[guildId].unshift(logEntry);

            // Trim logs if exceeding maximum
            if (logs[guildId].length > this.maxLogs) {
                logs[guildId] = logs[guildId].slice(0, this.maxLogs);
            }

            await this.saveLogs(logs);
            return logEntry;

        } catch (error) {
            console.error('Error adding log:', error);
            throw error;
        }
    }

    /**
     * Get logs for a guild
     * @param {string} guildId - ID of the guild
     * @param {number} limit - Maximum number of logs to return
     * @returns {Promise<Array>} Array of logs
     */
    async getGuildLogs(guildId, limit = 10) {
        try {
            const logs = await this.getLogs();
            const guildLogs = logs[guildId] || [];
            return guildLogs.slice(0, limit);
        } catch (error) {
            console.error('Error getting guild logs:', error);
            throw error;
        }
    }

    /**
     * Clear logs for a guild
     * @param {string} guildId - ID of the guild
     */
    async clearGuildLogs(guildId) {
        try {
            const logs = await this.getLogs();
            logs[guildId] = [];
            await this.saveLogs(logs);
        } catch (error) {
            console.error('Error clearing guild logs:', error);
            throw error;
        }
    }

    /**
     * Generate a unique log ID
     * @private
     * @returns {string} Unique ID
     */
    generateLogId() {
        return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Format log message
     * @param {Object} log - Log entry to format
     * @returns {string} Formatted log message
     */
    formatLogMessage(log) {
        let message = '';

        switch (log.type) {
            case 'ROLE_CREATED':
                message = `Role dibuat untuk ${log.userId}`;
                break;
            case 'ROLE_EDITED':
                message = `Role ${log.roleId} diupdate`;
                break;
            case 'ROLE_REMOVED':
                message = `Role ${log.roleId} dihapus`;
                break;
            case 'TEST_ROLE_CREATED':
                message = `Role test dibuat untuk ${log.userId} (durasi: ${log.duration}m)`;
                break;
            case 'TEST_ROLE_EXPIRED':
                message = `Role test ${log.roleId} berakhir`;
                break;
            case 'MEMBER_BOOSTED':
                message = `${log.userId} boost server`;
                break;
            case 'MEMBER_UNBOOSTED':
                message = `${log.userId} berhenti boost server`;
                break;
            case 'BOT_STARTUP':
                message = `Bot started (${log.totalCommands} commands loaded)`;
                break;
            case 'ERROR':
                message = `Error: ${log.error}`;
                break;
            default:
                message = `${log.type}: ${JSON.stringify(log)}`;
        }

        return message;
    }

    /**
     * Get formatted logs for display
     * @param {string} guildId - ID of the guild
     * @param {number} limit - Maximum number of logs to return
     * @returns {Promise<Array>} Array of formatted logs
     */
    async getFormattedLogs(guildId, limit = 10) {
        const logs = await this.getGuildLogs(guildId, limit);
        return logs.map(log => ({
            timestamp: moment(log.timestamp).format('DD/MM HH:mm:ss'),
            message: this.formatLogMessage(log)
        }));
    }
}

module.exports = new Logger();