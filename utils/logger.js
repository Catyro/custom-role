const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');

class Logger {
    static logPath = path.join(__dirname, '../data/logs.json');
    static maxLogs = 1000; // Maximum number of logs to keep

    /**
     * Log an event
     * @param {string} type - Type of log
     * @param {Object} data - Log data
     */
    static async log(type, data) {
        try {
            let logs = [];
            try {
                const content = await fs.readFile(this.logPath, 'utf8');
                logs = JSON.parse(content);
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
            }

            // Add new log entry
            const logEntry = {
                type,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'),
                ...data
            };

            logs.unshift(logEntry);

            // Keep only the latest maxLogs entries
            if (logs.length > this.maxLogs) {
                logs = logs.slice(0, this.maxLogs);
            }

            // Write back to file
            await fs.writeFile(this.logPath, JSON.stringify(logs, null, 2));

            return logEntry;

        } catch (error) {
            console.error('Error logging event:', error);
            throw error;
        }
    }

    /**
     * Get formatted logs for display
     * @param {string} guildId - Guild ID to filter logs
     * @param {number} limit - Maximum number of logs to return
     * @returns {Array} Formatted log entries
     */
    static async getFormattedLogs(guildId, limit = 15) {
        try {
            const content = await fs.readFile(this.logPath, 'utf8');
            let logs = JSON.parse(content);

            // Filter logs by guild if provided
            if (guildId) {
                logs = logs.filter(log => log.guildId === guildId);
            }

            // Limit number of logs
            logs = logs.slice(0, limit);

            // Format logs for display
            return logs.map(log => {
                const timestamp = moment(log.timestamp).tz('Asia/Jakarta').format('DD/MM HH:mm');
                let message = '';
                let emoji = '';

                switch (log.type) {
                    case 'ROLE_CREATED':
                        emoji = '🎨';
                        message = `Custom role dibuat untuk <@${log.userId}>`;
                        break;
                    case 'ROLE_EDITED':
                        emoji = '✏️';
                        message = `Role diupdate oleh <@${log.userId}>`;
                        if (log.updates) {
                            message += `\nPerubahan: ${Object.entries(log.updates)
                                .map(([key, value]) => `${key}: ${value}`)
                                .join(', ')}`;
                        }
                        break;
                    case 'ROLE_REMOVED':
                        emoji = '🗑️';
                        message = `Custom role dihapus dari <@${log.userId}>`;
                        break;
                    case 'MEMBER_BOOSTED':
                        emoji = '🌟';
                        message = `<@${log.userId}> mulai boost server`;
                        break;
                    case 'MEMBER_UNBOOSTED':
                        emoji = '💫';
                        message = `<@${log.userId}> berhenti boost server`;
                        break;
                    case 'TEST_ROLE_CREATED':
                        emoji = '🎯';
                        message = `Role test dibuat untuk <@${log.userId}> (${log.duration/60000} menit)`;
                        break;
                    case 'TEST_ROLE_EXPIRED':
                        emoji = '⌛';
                        message = `Role test berakhir untuk <@${log.userId}>`;
                        break;
                    case 'COMMAND_EXECUTE':
                        emoji = '🤖';
                        message = `Command /${log.command || 'unknown'} digunakan oleh <@${log.userId}>`;
                        break;
                    case 'ERROR':
                        emoji = '❌';
                        message = `Error: ${log.error}`;
                        break;
                    case 'CHANNEL_UPDATE':
                        emoji = '📌';
                        message = `Channel log diubah ke <#${log.channelId}>`;
                        break;
                    case 'BOT_STARTUP':
                        emoji = '🚀';
                        message = `Bot dimulai dengan ${log.totalCommands} commands`;
                        break;
                    default:
                        emoji = 'ℹ️';
                        message = log.message || 'Unknown log entry';
                }

                return {
                    timestamp,
                    message: `\`${timestamp}\` ${emoji} ${message}`
                };
            });

        } catch (error) {
            console.error('Error getting formatted logs:', error);
            return [];
        }
    }

    /**
     * Clear all logs
     */
    static async clearLogs() {
        try {
            await fs.writeFile(this.logPath, '[]');
        } catch (error) {
            console.error('Error clearing logs:', error);
            throw error;
        }
    }
}

module.exports = Logger;
