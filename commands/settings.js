// Di commands/settings.js
const { 
    SlashCommandBuilder, 
    ButtonBuilder, 
    ActionRowBuilder, 
    ButtonStyle,
    PermissionFlagsBits
} = require('discord.js');
const EmbedBuilder = require('../utils/embed-builder');
const Logger = require('../utils/logger');
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Pengaturan bot Custom Role')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            // Main menu buttons
            const mainButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('view_logs')
                        .setLabel('📜 Lihat Logs')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('set_channel')
                        .setLabel('📌 Set Channel Log')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('list_roles')
                        .setLabel('👑 List Role')
                        .setStyle(ButtonStyle.Primary)
                );

            const closeButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_settings')
                        .setLabel('❌ Tutup')
                        .setStyle(ButtonStyle.Danger)
                );

            const settingsEmbed = new EmbedBuilder()
                .setTitle('⚙️ Pengaturan Bot Custom Role')
                .setDescription('Silahkan pilih menu yang tersedia di bawah ini:')
                .addFields([
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
                ])
                .setColor(0x007bff)
                .setTimestamp()
                .setFooter({ 
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                });

            await interaction.reply({
                embeds: [settingsEmbed],
                components: [mainButtons, closeButton],
                ephemeral: true
            });

            // Log command execution
            await Logger.log('COMMAND_EXECUTE', {
                guildId: interaction.guild.id,
                type: 'SETTINGS_OPENED',
                userId: interaction.user.id,
                command: 'settings',
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

        } catch (error) {
            console.error('Error in settings command:', error);
            await interaction.reply({
                content: '❌ Terjadi kesalahan saat membuka pengaturan.',
                ephemeral: true
            });
            
            await Logger.log('ERROR', {
                guildId: interaction.guild.id,
                type: 'SETTINGS_ERROR',
                error: error.message,
                userId: interaction.user.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });
        }
    }
};
