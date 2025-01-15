const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');
const config = require('../config');

class Logger {
    static async log(category, data) {
        try {
            const timestamp = moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');
            const logDate = moment().tz('Asia/Jakarta').format('YYYY-MM-DD');
            const logDir = path.join(__dirname, '../logs');
            const logFile = path.join(logDir, `${logDate}.json`);

            // Create logs directory if it doesn't exist
            await fs.mkdir(logDir, { recursive: true });

            // Read existing logs or create new array
            let logs = [];
            try {
                const fileContent = await fs.readFile(logFile, 'utf-8');
                logs = JSON.parse(fileContent);
            } catch (error) {
                // File doesn't exist or is invalid, start with empty array
            }

            // Add new log entry
            logs.push({
                timestamp,
                category,
                ...data
            });

            // Write updated logs
            await fs.writeFile(logFile, JSON.stringify(logs, null, 2));

            // Cleanup old logs (older than 7 days)
            await this.cleanupOldLogs();

        } catch (error) {
            console.error('Error writing log:', error);
        }
    }

    static async getLogs(guildId, limit = 10) {
        try {
            const logDir = path.join(__dirname, '../logs');
            const files = await fs.readdir(logDir);
            
            // Get all log entries from the last 7 days
            let allLogs = [];
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                
                const filePath = path.join(logDir, file);
                const content = await fs.readFile(filePath, 'utf-8');
                const logs = JSON.parse(content);
                
                // Filter logs for specific guild
                const guildLogs = logs.filter(log => log.guildId === guildId);
                allLogs.push(...guildLogs);
            }

            // Sort by timestamp descending and limit
            return allLogs
                .sort((a, b) => moment(b.timestamp).valueOf() - moment(a.timestamp).valueOf())
                .slice(0, limit);

        } catch (error) {
            console.error('Error reading logs:', error);
            return [];
        }
    }

    static async cleanupOldLogs() {
        try {
            const logDir = path.join(__dirname, '../logs');
            const files = await fs.readdir(logDir);
            const now = moment();

            for (const file of files) {
                if (!file.endsWith('.json')) continue;

                const filePath = path.join(logDir, file);
                const fileDate = moment(file.replace('.json', ''));

                // Delete files older than 7 days
                if (now.diff(fileDate, 'days') > 7) {
                    await fs.unlink(filePath);
                }
            }
        } catch (error) {
            console.error('Error cleaning up logs:', error);
        }
    }
}

module.exports = Logger;