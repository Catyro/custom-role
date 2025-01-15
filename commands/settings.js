const { 
    SlashCommandBuilder, 
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const CustomEmbedBuilder = require('../utils/embed-builder');
const Logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Mengatur pengaturan bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            // Check permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return await interaction.reply({
                    embeds: [
                        new CustomEmbedBuilder()
                            .setError('Akses Ditolak', 
                                'Kamu tidak memiliki izin untuk menggunakan command ini.')
                    ],
                    ephemeral: true
                });
            }

            // Create settings embed
            const settingsEmbed = new CustomEmbedBuilder()
                .setSettings('⚙️ Pengaturan Bot',
                    'Silakan pilih pengaturan yang ingin diubah:')
                .addFields([
                    { 
                        name: '📝 Log Channel',
                        value: 'Mengatur channel untuk menyimpan log aktivitas bot',
                        inline: true
                    },
                    {
                        name: '🎨 Role Settings',
                        value: 'Mengatur pengaturan default untuk role',
                        inline: true
                    },
                    {
                        name: '⏱️ Duration Settings',
                        value: 'Mengatur durasi default untuk test role',
                        inline: true
                    }
                ]);

            // Create buttons
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('settings_logs')
                        .setLabel('📝 Log Channel')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('settings_roles')
                        .setLabel('🎨 Role Settings')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('settings_duration')
                        .setLabel('⏱️ Duration')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('settings_close')
                        .setLabel('❌ Tutup')
                        .setStyle(ButtonStyle.Danger)
                );

            await interaction.reply({
                embeds: [settingsEmbed],
                components: [buttons],
                ephemeral: true
            });

            await Logger.log('COMMAND_EXECUTE', {
                guildId: interaction.guild.id,
                type: 'SETTINGS_OPEN',
                userId: 'Catyro',
                timestamp: '2025-01-15 10:23:59'
            });

        } catch (error) {
            console.error('Error in settings command:', error);
            
            await interaction.reply({
                embeds: [
                    new CustomEmbedBuilder()
                        .setError('Error',
                            'Terjadi kesalahan saat membuka pengaturan.')
                ],
                ephemeral: true
            });

            await Logger.log('ERROR', {
                guildId: interaction.guild.id,
                type: 'SETTINGS_ERROR',
                error: error.message,
                userId: 'Catyro',
                timestamp: '2025-01-15 10:23:59'
            });
        }
    },

    /**
     * Creates a modal for setting log channel
     */
    async createLogChannelModal() {
        const modal = new ModalBuilder()
            .setCustomId('set_channel_modal')
            .setTitle('Set Log Channel');

        const channelInput = new TextInputBuilder()
            .setCustomId('channel_id')
            .setLabel('Channel ID atau #mention')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Contoh: #logs atau 123456789')
            .setRequired(true);

        const firstRow = new ActionRowBuilder().addComponents(channelInput);
        modal.addComponents(firstRow);

        return modal;
    },

    /**
     * Creates a modal for editing role settings
     */
    async createRoleSettingsModal(currentSettings) {
        const modal = new ModalBuilder()
            .setCustomId('edit_role_settings')
            .setTitle('Edit Role Settings');

        const colorInput = new TextInputBuilder()
            .setCustomId('default_color')
            .setLabel('Default Color (HEX atau nama warna)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('#F47FFF atau PINK')
            .setValue(currentSettings?.defaultColor || '#F47FFF')
            .setRequired(true);

        const permissionsInput = new TextInputBuilder()
            .setCustomId('default_permissions')
            .setLabel('Default Permissions (comma separated)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('SendMessages, ReadMessageHistory, ViewChannel')
            .setValue(currentSettings?.defaultPermissions || 'SendMessages, ReadMessageHistory, ViewChannel')
            .setRequired(true);

        const firstRow = new ActionRowBuilder().addComponents(colorInput);
        const secondRow = new ActionRowBuilder().addComponents(permissionsInput);
        modal.addComponents(firstRow, secondRow);

        return modal;
    },

    /**
     * Creates a modal for editing duration settings
     */
    async createDurationSettingsModal(currentSettings) {
        const modal = new ModalBuilder()
            .setCustomId('edit_duration_modal')
            .setTitle('Edit Duration Settings');

        const defaultDurationInput = new TextInputBuilder()
            .setCustomId('default_duration')
            .setLabel('Default Duration (e.g., 1m, 30s, 2h)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('1m')
            .setValue(currentSettings?.defaultDuration || '1m')
            .setRequired(true);

        const maxDurationInput = new TextInputBuilder()
            .setCustomId('max_duration')
            .setLabel('Maximum Duration (e.g., 24h)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('24h')
            .setValue(currentSettings?.maxDuration || '24h')
            .setRequired(true);

        const firstRow = new ActionRowBuilder().addComponents(defaultDurationInput);
        const secondRow = new ActionRowBuilder().addComponents(maxDurationInput);
        modal.addComponents(firstRow, secondRow);

        return modal;
    }
};
