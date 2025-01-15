const fs = require('fs').promises;
const path = require('path');
const moment = require('moment');

class Logger {
    static logPath = path.join(__dirname, '../data/logs.json');
    static MAX_LOGS = 1000; // Maximum number of logs to keep

    /**
     * Initialize logger
     * @returns {Promise<void>}
     */
    static async init() {
        try {
            await this.checkLogFile();
        } catch (error) {
            console.error('Error initializing logger:', error);
        }
    }

    /**
     * Check and create log file if doesn't exist
     * @returns {Promise<void>}
     */
    static async checkLogFile() {
        try {
            await fs.access(this.logPath);
        } catch {
            await fs.writeFile(this.logPath, JSON.stringify([], null, 2));
        }
    }

    /**
     * Add a new log entry
     * @param {string} type - Log type
     * @param {Object} data - Log data
     * @returns {Promise<void>}
     */
    static async log(type, data) {
        try {
            await this.checkLogFile();

            // Read current logs
            const logs = JSON.parse(await fs.readFile(this.logPath, 'utf-8'));

            // Add new log
            const logEntry = {
                id: this.generateLogId(),
                type: type,
                ...data,
                timestamp: data.timestamp || moment().utc().format('YYYY-MM-DD HH:mm:ss')
            };

            logs.unshift(logEntry); // Add to beginning of array

            // Keep only the latest MAX_LOGS entries
            if (logs.length > this.MAX_LOGS) {
                logs.length = this.MAX_LOGS;
            }

            // Write back to file
            await fs.writeFile(this.logPath, JSON.stringify(logs, null, 2));

            // Console log for debugging
            console.log(`[${logEntry.timestamp}] ${type}:`, data);

        } catch (error) {
            console.error('Error logging:', error);
        }
    }

    /**
     * Get formatted logs
     * @param {string} guildId - Discord guild ID
     * @param {number} limit - Maximum number of logs to return
     * @returns {Promise<Array>} Formatted logs
     */
    static async getFormattedLogs(guildId, limit = 15) {
        try {
            await this.checkLogFile();

            const logs = JSON.parse(await fs.readFile(this.logPath, 'utf-8'));
            
            return logs
                .filter(log => log.guildId === guildId)
                .slice(0, limit)
                .map(log => this.formatLogEntry(log));

        } catch (error) {
            console.error('Error getting logs:', error);
            return [];
        }
    }

    /**
     * Format a log entry for display
     * @param {Object} log - Log entry
     * @returns {Object} Formatted log
     */
    static formatLogEntry(log) {
        const timestamp = moment(log.timestamp).format('DD/MM HH:mm');
        let emoji, message;

        switch (log.type) {
            case 'ROLE_CREATE':
                emoji = '👑';
                message = `Role dibuat untuk <@${log.userId}>`;
                break;

            case 'ROLE_UPDATE':
                emoji = '✏️';
                message = `Role diupdate oleh <@${log.updatedBy}>`;
                break;

            case 'ROLE_DELETE':
                emoji = '🗑️';
                message = `Role "${log.roleName}" dihapus`;
                break;

            case 'TEST_ROLE_CREATE':
                emoji = '🎯';
                message = `Test role dibuat untuk <@${log.userId}>`;
                break;

            case 'TEST_ROLE_EXPIRE':
                emoji = '⌛';
                message = `Test role expired untuk <@${log.userId}>`;
                break;

            case 'CHANNEL_SET':
                emoji = '📌';
                message = `Channel log diatur ke <#${log.channelId}>`;
                break;

            case 'ERROR':
                emoji = '❌';
                message = `Error: ${log.error}`;
                break;

            case 'COMMAND_EXECUTE':
                emoji = '🤖';
                message = `Command "${log.type}" digunakan oleh <@${log.userId}>`;
                break;

            default:
                emoji = 'ℹ️';
                message = 'Unknown log entry';
        }

        return {
            timestamp,
            emoji,
            message,
            original: log
        };
    }

    /**
     * Generate unique log ID
     * @returns {string} Unique ID
     */
    static generateLogId() {
        return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clear old logs
     * @param {string} guildId - Discord guild ID
     * @param {number} daysToKeep - Days of logs to keep
     * @returns {Promise<number>} Number of logs deleted
     */
    static async clearOldLogs(guildId, daysToKeep = 30) {
        try {
            await this.checkLogFile();

            const logs = JSON.parse(await fs.readFile(this.logPath, 'utf-8'));
            const cutoffDate = moment().subtract(daysToKeep, 'days');

            const newLogs = logs.filter(log => 
                log.guildId !== guildId || 
                moment(log.timestamp).isAfter(cutoffDate)
            );

            const deletedCount = logs.length - newLogs.length;

            await fs.writeFile(this.logPath, JSON.stringify(newLogs, null, 2));

            return deletedCount;

        } catch (error) {
            console.error('Error clearing old logs:', error);
            return 0;
        }
    }

    /**
     * Get log statistics
     * @param {string} guildId - Discord guild ID
     * @returns {Promise<Object>} Log statistics
     */
    static async getLogStats(guildId) {
        try {
            await this.checkLogFile();

            const logs = JSON.parse(await fs.readFile(this.logPath, 'utf-8'));
            const guildLogs = logs.filter(log => log.guildId === guildId);

            return {
                total: guildLogs.length,
                types: this.countLogTypes(guildLogs),
                lastActivity: guildLogs[0]?.timestamp || 'No logs',
                firstLog: guildLogs[guildLogs.length - 1]?.timestamp || 'No logs'
            };

        } catch (error) {
            console.error('Error getting log stats:', error);
            return {
                total: 0,
                types: {},
                lastActivity: 'Error',
                firstLog: 'Error'
            };
        }
    }

    /**
     * Count log types
     * @param {Array} logs - Array of logs
     * @returns {Object} Count of each log type
     */
    static countLogTypes(logs) {
        return logs.reduce((acc, log) => {
            acc[log.type] = (acc[log.type] || 0) + 1;
            return acc;
        }, {});
    }
}

module.exports = Logger;
