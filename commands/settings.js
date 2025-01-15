const { 
    SlashCommandBuilder, 
    ButtonBuilder, 
    ActionRowBuilder, 
    ButtonStyle,
    PermissionFlagsBits
} = require('discord.js');
const EmbedService = require('../utils/embed-builder');
const Logger = require('../utils/logger');
const config = require('../config');
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Pengaturan bot Custom Role')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            // Create main menu buttons
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('view_logs')
                        .setLabel('📜 Lihat Logs')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('set_log_channel')
                        .setLabel('📌 Set Channel Log')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('list_roles')
                        .setLabel('👑 List Role')
                        .setStyle(ButtonStyle.Primary)
                );

            // Create settings embed
            const settingsEmbed = EmbedService.createEmbed({
                title: '⚙️ Pengaturan Bot Custom Role',
                description: 'Silahkan pilih menu yang tersedia di bawah ini:',
                fields: [
                    {
                        name: '📜 Lihat Logs',
                        value: 'Melihat riwayat aktivitas bot',
                        inline: true
                    },
                    {
                        name: '📌 Set Channel Log',
                        value: 'Mengatur channel untuk log bot',
                        inline: true
                    },
                    {
                        name: '👑 List Role',
                        value: 'Melihat daftar custom role',
                        inline: true
                    }
                ],
                footer: {
                    text: `Requested by ${interaction.user.tag}`
                },
                timestamp: true,
                color: config.EMBED_COLORS.PRIMARY
            });

            await interaction.reply({
                embeds: [settingsEmbed],
                components: [buttons],
                ephemeral: true
            });

            // Log command usage
            await Logger.log('COMMAND', {
                type: 'SETTINGS_OPENED',
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

        } catch (error) {
            console.error('Error in settings command:', error);
            await Logger.log('ERROR', {
                type: 'COMMAND_ERROR',
                command: 'settings',
                error: error.message,
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

            await interaction.reply({
                content: '❌ Terjadi kesalahan saat membuka pengaturan.',
                ephemeral: true
            });
        }
    }
};