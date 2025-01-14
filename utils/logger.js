const fs = require('fs-extra');
const path = require('path');
const { EmbedBuilder, WebhookClient } = require('discord.js');
const moment = require('moment-timezone');

class Logger {
    constructor() {
        this.logs = [];
        this.logChannel = null;
        this.maxLogs = 1000;
        this.client = null;
        this.logFile = path.join(__dirname, '../data/logs.json');
        this.timezone = 'Asia/Jakarta';
        this.rotationInterval = 24 * 60 * 60 * 1000; // 24 hours
        this.lastRotation = Date.now();
    }

    async init() {
        try {
            await fs.ensureDir(path.dirname(this.logFile));
            if (await fs.pathExists(this.logFile)) {
                const data = await fs.readJson(this.logFile);
                this.logs = data.logs || [];
                this.lastRotation = data.lastRotation || Date.now();
            }
            
            // Setup log rotation
            setInterval(() => this.rotateLogFiles(), this.rotationInterval);
            
            return true;
        } catch (error) {
            console.error('Error initializing logger:', error);
            return false;
        }
    }

    setClient(client) {
        this.client = client;
        return true;
    }

    formatDate(timestamp = null) {
        return moment(timestamp).tz(this.timezone).format('YYYY-MM-DD HH:mm:ss');
    }

    async log(type, details) {
        try {
            const logEntry = {
                id: this.generateLogId(),
                type,
                ...details,
                timestamp: details.timestamp || this.formatDate(),
                user: details.user || (details.userId ? `<@${details.userId}>` : 'System')
            };

            // Add stack trace for errors
            if (type === 'ERROR' && details.error instanceof Error) {
                logEntry.stack = details.error.stack;
            }

            this.logs.unshift(logEntry);
            
            if (this.logs.length > this.maxLogs) {
                await this.rotateLogFiles();
            }

            await this.saveLogsToDisk();
            await this.sendLogToChannel(logEntry);

            return true;
        } catch (error) {
            console.error('Error logging:', error);
            return false;
        }
    }

    async rotateLogFiles() {
        try {
            const date = moment().format('YYYY-MM-DD');
            const archivePath = path.join(__dirname, '../data/logs', `logs-${date}.json`);
            
            await fs.ensureDir(path.dirname(archivePath));
            await fs.writeJson(archivePath, {
                logs: this.logs,
                rotatedAt: Date.now()
            }, { spaces: 2 });

            this.logs = this.logs.slice(0, Math.floor(this.maxLogs / 2));
            this.lastRotation = Date.now();
            await this.saveLogsToDisk();

            // Clean up old log files (keep last 7 days)
            const logDir = path.join(__dirname, '../data/logs');
            const files = await fs.readdir(logDir);
            const oldFiles = files
                .filter(f => f.startsWith('logs-') && f.endsWith('.json'))
                .sort()
                .slice(0, -7);

            for (const file of oldFiles) {
                await fs.remove(path.join(logDir, file));
            }
        } catch (error) {
            console.error('Error rotating logs:', error);
        }
    }

    async saveLogsToDisk() {
        try {
            await fs.writeJson(this.logFile, {
                logs: this.logs,
                lastRotation: this.lastRotation
            }, { spaces: 2 });
        } catch (error) {
            console.error('Error saving logs:', error);
        }
    }

    async getLogs(limit = 100) {
        try {
            const validLogs = this.logs
                .slice(0, limit)
                .filter(log => log && log.timestamp)
                .map(log => this.formatLogEntry(log))
                .filter(entry => entry !== null)
                .join('\n');

            if (!validLogs) {
                return '*Tidak ada log yang tersedia.*';
            }

            return validLogs;
        } catch (error) {
            console.error(`[${this.formatDate()}] Error getting logs:`, error);
            return '*Error saat mengambil log.*';
        }
    }

    formatLogEntry(log) {
        if (!log || !log.timestamp) return null;

        const timestamp = this.formatDate(log.timestamp);
        const emoji = this.getLogEmoji(log.type);
        const mention = log.user || `<@${log.userId}>`;

        switch (log.type) {
            case 'COMMAND_EXECUTE':
                return `${emoji} \`${timestamp}\` ${mention} menggunakan \`/${log.command}\``;
            case 'LOG_CHANNEL_SET':
                return `${emoji} \`${timestamp}\` Channel log diatur ke <#${log.channelId}> oleh ${mention}`;
            case 'CUSTOM_ROLE_CREATE':
                return `${emoji} \`${timestamp}\` Role <@&${log.roleId}> dibuat untuk ${mention}`;
            case 'ROLE_DELETE':
                return `${emoji} \`${timestamp}\` Role <@&${log.roleId}> dihapus oleh ${mention}`;
            case 'ROLE_UPDATE':
                return `${emoji} \`${timestamp}\` Role <@&${log.roleId}> diupdate oleh ${mention}`;
            case 'ERROR':
                return `${emoji} \`${timestamp}\` Error pada \`/${log.command}\`: ${log.error}`;
            case 'SYSTEM':
                return `${emoji} \`${timestamp}\` ${log.message || 'System event'}`;
            case 'SHUTDOWN':
                return `${emoji} \`${timestamp}\` Bot dimatikan oleh ${mention}`;
            case 'BOOST':
                return `${emoji} \`${timestamp}\` ${mention} telah boost server!`;
            case 'UNBOOST':
                return `${emoji} \`${timestamp}\` ${mention} telah berhenti boost server`;
            case 'BUTTON_INTERACTION':
                return `${emoji} \`${timestamp}\` ${mention} menggunakan tombol \`${log.buttonId}\``;
            case 'MODAL_SUBMIT':
                return `${emoji} \`${timestamp}\` ${mention} telah submit form \`${log.modalId}\``;
            default:
                const details = log.details ? `: ${log.details}` : '';
                return `${emoji} \`${timestamp}\` ${log.type}${details}`;
        }
    }

    async sendLogToChannel(logEntry) {
        if (!this.logChannel) return;

        try {
            const embed = new EmbedBuilder()
                .setColor(this.getLogColor(logEntry.type))
                .setTitle(this.getLogTitle(logEntry.type))
                .setDescription(this.formatLogMessage(logEntry))
                .setTimestamp()
                .setFooter({ 
                    text: `Log ID: ${logEntry.id}`,
                    iconURL: this.client?.user?.displayAvatarURL()
                });

            // Add fields for additional details
            if (logEntry.details) {
                Object.entries(logEntry.details)
                    .filter(([key]) => !['type', 'timestamp', 'user', 'userId'].includes(key))
                    .forEach(([key, value]) => {
                        embed.addFields({ 
                            name: key.charAt(0).toUpperCase() + key.slice(1), 
                            value: String(value).substring(0, 1024),
                            inline: true 
                        });
                    });
            }

            await this.logChannel.send({ embeds: [embed] });
        } catch (error) {
            console.error('Error sending log to channel:', error);
        }
    }

    formatLogMessage(logEntry) {
        const mention = logEntry.user || `<@${logEntry.userId}>`;
        
        switch (logEntry.type) {
            case 'COMMAND_EXECUTE':
                return `**${mention}** telah menggunakan command \`/${logEntry.command}\``;
            case 'LOG_CHANNEL_SET':
                return `Channel log telah diatur ke <#${logEntry.channelId}> oleh **${mention}**`;
            case 'CUSTOM_ROLE_CREATE':
                return `Role <@&${logEntry.roleId}> telah dibuat untuk **${mention}**`;
            case 'ROLE_DELETE':
                return `Role <@&${logEntry.roleId}> telah dihapus oleh **${mention}**`;
            case 'ROLE_UPDATE':
                return `Role <@&${logEntry.roleId}> telah diupdate oleh **${mention}**`;
            case 'ERROR':
                return `Terjadi error pada command \`/${logEntry.command}\`:\n\`\`\`\n${logEntry.error}\n\`\`\`${
                    logEntry.stack ? `\nStack Trace:\n\`\`\`\n${logEntry.stack}\n\`\`\`` : ''
                }`;
            case 'SYSTEM':
                return logEntry.message || 'System event occurred';
            case 'SHUTDOWN':
                return `Bot telah dimatikan oleh **${mention}**`;
            case 'BOOST':
                return `🎉 **${mention}** telah boost server!`;
            case 'UNBOOST':
                return `**${mention}** telah berhenti boost server`;
            case 'BUTTON_INTERACTION':
                return `**${mention}** menggunakan tombol \`${logEntry.buttonId}\``;
            case 'MODAL_SUBMIT':
                return `**${mention}** telah submit form \`${logEntry.modalId}\``;
            case 'ROLE_TEST':
                return `**${mention}** sedang menguji role <@&${logEntry.roleId}>`;
            case 'ROLE_TEST_END':
                return `Test role <@&${logEntry.roleId}> oleh **${mention}** telah selesai`;
            default:
                const details = logEntry.details ? `\n\`\`\`json\n${JSON.stringify(logEntry.details, null, 2)}\n\`\`\`` : '';
                return `${logEntry.type}${details}`;
        }
    }

    getLogEmoji(type) {
        const emojis = {
            'COMMAND_EXECUTE': '🤖',
            'LOG_CHANNEL_SET': '📌',
            'CUSTOM_ROLE_CREATE': '✨',
            'ROLE_DELETE': '🗑️',
            'ROLE_UPDATE': '📝',
            'ERROR': '❌',
            'SYSTEM': '⚙️',
            'SHUTDOWN': '💤',
            'BOOST': '🚀',
            'UNBOOST': '📉',
            'BUTTON_INTERACTION': '🔘',
            'MODAL_SUBMIT': '📝',
            'ROLE_TEST': '🧪',
            'ROLE_TEST_END': '✅'
        };
        return emojis[type] || '📝';
    }

    getLogColor(type) {
        const colors = {
            'COMMAND_EXECUTE': 0x3498db,
            'LOG_CHANNEL_SET': 0xf1c40f,
            'CUSTOM_ROLE_CREATE': 0x2ecc71,
            'ROLE_DELETE': 0xe74c3c,
            'ROLE_UPDATE': 0x9b59b6,
            'ERROR': 0xe74c3c,
            'SYSTEM': 0x95a5a6,
            'SHUTDOWN': 0x34495e,
            'BOOST': 0xf47fff,
            'UNBOOST': 0x747f8d,
            'BUTTON_INTERACTION': 0x3498db,
            'MODAL_SUBMIT': 0x9b59b6,
            'ROLE_TEST': 0x3498db,
            'ROLE_TEST_END': 0x2ecc71
        };
        return colors[type] || 0x95a5a6;
    }

    getLogTitle(type) {
        const titles = {
            'COMMAND_EXECUTE': '🤖 Command Executed',
            'LOG_CHANNEL_SET': '📌 Log Channel Updated',
            'CUSTOM_ROLE_CREATE': '✨ Custom Role Created',
            'ROLE_DELETE': '🗑️ Role Deleted',
            'ROLE_UPDATE': '📝 Role Updated',
            'ERROR': '❌ Error Occurred',
            'SYSTEM': '⚙️ System Event',
            'SHUTDOWN': '💤 Bot Shutdown',
            'BOOST': '🚀 Server Boosted',
            'UNBOOST': '📉 Server Boost Removed',
            'BUTTON_INTERACTION': '🔘 Button Interaction',
            'MODAL_SUBMIT': '📝 Modal Submitted',
            'ROLE_TEST': '🧪 Role Test Started',
            'ROLE_TEST_END': '✅ Role Test Completed'
        };
        return titles[type] || `📝 ${type}`;
    }

    async searchLogs(query, options = {}) {
        try {
            const {
                limit = 100,
                type = null,
                startDate = null,
                endDate = null,
                userId = null
            } = options;

            let filteredLogs = this.logs;

            if (type) {
                filteredLogs = filteredLogs.filter(log => log.type === type);
            }

            if (startDate) {
                const start = moment(startDate).valueOf();
                filteredLogs = filteredLogs.filter(log => 
                    moment(log.timestamp).valueOf() >= start
                );
            }

            if (endDate) {
                const end = moment(endDate).valueOf();
                filteredLogs = filteredLogs.filter(log => 
                    moment(log.timestamp).valueOf() <= end
                );
            }

            if (userId) {
                filteredLogs = filteredLogs.filter(log => 
                    log.userId === userId || log.user?.includes(userId)
                );
            }

            if (query) {
                const searchQuery = query.toLowerCase();
                filteredLogs = filteredLogs.filter(log => 
                    JSON.stringify(log).toLowerCase().includes(searchQuery)
                );
            }

            return filteredLogs.slice(0, limit);
        } catch (error) {
            console.error('Error searching logs:', error);
            return [];
        }
    }

    async getLogStats() {
        try {
            const now = moment();
            const stats = {
                total: this.logs.length,
                today: 0,
                errors: 0,
                commandsToday: 0,
                popularCommands: {},
                activeUsers: new Set(),
                roleOperations: {
                    created: 0,
                    deleted: 0,
                    updated: 0
                }
            };

            this.logs.forEach(log => {
                const logDate = moment(log.timestamp);
                if (logDate.isSame(now, 'day')) {
                    stats.today++;
                    if (log.type === 'COMMAND_EXECUTE') {
                        stats.commandsToday++;
                        stats.popularCommands[log.command] = (stats.popularCommands[log.command] || 0) + 1;
                    }
                }

                // Track role operations
                switch(log.type) {
                    case 'CUSTOM_ROLE_CREATE':
                        stats.roleOperations.created++;
                        break;
                    case 'ROLE_DELETE':
                        stats.roleOperations.deleted++;
                        break;
                    case 'ROLE_UPDATE':
                        stats.roleOperations.updated++;
                        break;
                }

                if (log.type === 'ERROR') stats.errors++;
                if (log.userId) stats.activeUsers.add(log.userId);
            });

            stats.activeUsers = stats.activeUsers.size;
            stats.popularCommands = Object.entries(stats.popularCommands)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

            return stats;
        } catch (error) {
            console.error('Error getting log stats:', error);
            return null;
        }
    }

    async setLogChannel(channelInput) {
        try {
            if (!this.client) {
                throw new Error('Client not set');
            }

            let channelId;

            if (typeof channelInput === 'string') {
                channelId = channelInput.replace(/[<#>]/g, '');
            } else if (typeof channelInput === 'object' && channelInput.id) {
                channelId = channelInput.id;
            } else {
                throw new Error('Invalid channel input');
            }

            const channel = await this.client.channels.fetch(channelId);
            if (!channel) {
                throw new Error('Channel not found');
            }

            const permissions = channel.permissionsFor(this.client.user);
            if (!permissions.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
                throw new Error('Bot lacks required permissions in the channel');
            }

            this.logChannel = channel;
            
            const testEmbed = new EmbedBuilder()
                .setColor(this.getLogColor('LOG_CHANNEL_SET'))
                .setTitle(this.getLogTitle('LOG_CHANNEL_SET'))
                .setDescription('Channel ini telah diatur sebagai log channel.')
                .setTimestamp()
                .setFooter({ 
                    text: `Log ID: ${this.generateLogId()}`,
                    iconURL: this.client.user.displayAvatarURL()
                });

            await channel.send({ embeds: [testEmbed] });
            
            await this.log('LOG_CHANNEL_SET', {
                channelId: channel.id,
                userId: this.client.user.id
            });

            return true;
        } catch (error) {
            console.error(`[${this.formatDate()}] Error setting log channel:`, error);
            return false;
        }
    }

    generateLogId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 5);
        return `${timestamp}-${random}`.toUpperCase();
    }

    async cleanup() {
        try {
            // Save any remaining logs
            await this.saveLogsToDisk();
            
            // Clear memory
            this.logs = [];
            this.logChannel = null;
            
            return true;
        } catch (error) {
            console.error('Error during logger cleanup:', error);
            return false;
        }
    }
}

module.exports = new Logger();