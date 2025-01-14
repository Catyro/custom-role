const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');
const config = require('../config');

class Logger {
    static async log(type, data) {
        try {
            // Add timestamp if not present
            if (!data.timestamp) {
                data.timestamp = moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss');
            }

            const logEntry = {
                type,
                ...data,
                loggedAt: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            };

            // Read existing logs
            const logsPath = path.join(__dirname, '..', 'data', 'logs.json');
            let logs = [];
            
            try {
                const fileContent = await fs.readFile(logsPath, 'utf8');
                logs = JSON.parse(fileContent);
            } catch (error) {
                // If file doesn't exist or is invalid, start with empty array
                console.warn('Creating new logs file');
            }

            // Add new log
            logs.push(logEntry);

            // Keep only last 1000 logs
            if (logs.length > 1000) {
                logs = logs.slice(-1000);
            }

            // Write back to file
            await fs.writeFile(logsPath, JSON.stringify(logs, null, 2));

            // Console log in development
            if (config.DEBUG_MODE) {
                console.log(`[${type}] ${JSON.stringify(data, null, 2)}`);
            }

        } catch (error) {
            console.error('Error writing to log:', error);
        }
    }

    static async getLogs(type = null, limit = 100) {
        try {
            const logsPath = path.join(__dirname, '..', 'data', 'logs.json');
            const fileContent = await fs.readFile(logsPath, 'utf8');
            let logs = JSON.parse(fileContent);

            if (type) {
                logs = logs.filter(log => log.type === type);
            }

            return logs.slice(-limit);
        } catch (error) {
            console.error('Error reading logs:', error);
            return [];
        }
    }

    static async rotateLogFiles() {
        try {
            const logsPath = path.join(__dirname, '..', 'data', 'logs.json');
            const backupPath = path.join(
                __dirname, 
                '..', 
                'data', 
                `logs_backup_${moment().tz('Asia/Jakarta').format('YYYY-MM-DD')}.json`
            );

            // Check if logs file exists
            try {
                await fs.access(logsPath);
            } catch {
                // If no logs file exists, nothing to rotate
                return;
            }

            // Create backup
            await fs.copyFile(logsPath, backupPath);

            // Clear main logs file
            await fs.writeFile(logsPath, JSON.stringify([], null, 2));

            await this.log('SYSTEM', {
                type: 'LOG_ROTATION',
                message: `Logs rotated to ${backupPath}`,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

        } catch (error) {
            console.error('Error rotating logs:', error);
        }
    }
}

module.exports = Logger;