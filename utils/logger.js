const { EmbedBuilder } = require('discord.js');

class Logger {
    constructor() {
        this.logs = [];
        this.logChannel = null;
        this.maxLogs = 1000;
        this.client = null;
        this.currentUser = 'Catyro';
        this.defaultTimestamp = '2025-01-14 11:50:21';
    }

    setClient(client) {
        this.client = client;
        return true;
    }

    formatDate(date = this.defaultTimestamp) {
        if (typeof date === 'string') {
            return date;
        }
        const d = date instanceof Date ? date : new Date(date);
        const pad = (n) => n.toString().padStart(2, '0');
        
        return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
    }

    async log(type, details) {
        const logEntry = {
            type,
            ...details,
            timestamp: details.timestamp || this.defaultTimestamp,
            user: details.user || this.currentUser
        };

        this.logs.unshift(logEntry);
        
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        if (this.logChannel) {
            try {
                const embed = new EmbedBuilder()
                    .setColor(this.getLogColor(type))
                    .setTitle(this.getLogTitle(type))
                    .setDescription(this.formatLogMessage(logEntry))
                    .setTimestamp()
                    .setFooter({ 
                        text: `Log ID: ${this.generateLogId()}`,
                        iconURL: this.client?.user?.displayAvatarURL()
                    });

                await this.logChannel.send({ embeds: [embed] });
            } catch (error) {
                console.error('Error sending log to channel:', error);
            }
        }

        return true;
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
            default:
                const details = log.details ? `: ${log.details}` : '';
                return `${emoji} \`${timestamp}\` ${log.type}${details}`;
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
            'UNBOOST': '📉'
        };
        return emojis[type] || '📝';
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
                .setColor('#43B581')
                .setTitle('✅ Logger Channel Set')
                .setDescription(`This channel has been set as the logging channel.\nTimestamp: ${this.defaultTimestamp}`)
                .setFooter({ text: this.currentUser });

            await channel.send({ embeds: [testEmbed] });
            
            await this.log('LOG_CHANNEL_SET', {
                channelId: channel.id,
                userId: this.client.user.id,
                timestamp: this.defaultTimestamp
            });

            console.log(`Logger channel set to: ${channel.name} (${channel.id})`);
            return true;
        } catch (error) {
            console.error(`[${this.formatDate()}] Error setting log channel:`, error);
            return false;
        }
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
            'UNBOOST': 0x747f8d
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
            'UNBOOST': '📉 Server Boost Removed'
        };
        return titles[type] || `📝 ${type}`;
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
                return `Terjadi error pada command \`/${logEntry.command}\`:\n\`\`\`\n${logEntry.error}\n\`\`\``;
            case 'SYSTEM':
                return logEntry.message || 'System event occurred';
            case 'SHUTDOWN':
                return `Bot telah dimatikan oleh **${mention}**`;
            case 'BOOST':
                return `🎉 **${mention}** telah boost server!`;
            case 'UNBOOST':
                return `**${mention}** telah berhenti boost server`;
            default:
                const details = logEntry.details ? `\n\`\`\`json\n${JSON.stringify(logEntry.details, null, 2)}\n\`\`\`` : '';
                return `${logEntry.type}${details}`;
        }
    }

    generateLogId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 5);
        return `${timestamp}-${random}`.toUpperCase();
    }
}

module.exports = new Logger();