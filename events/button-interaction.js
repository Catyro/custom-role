const { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const CustomEmbedBuilder = require('../utils/embed-builder');
const RoleManager = require('../utils/role-manager');
const Logger = require('../utils/logger');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return;

        try {
            const [action, roleId] = interaction.customId.split('_');

            switch(action) {
                case 'upload':
                    if (interaction.customId.includes('icon')) {
                        await handleIconUpload(interaction, roleId);
                    }
                    break;

                case 'skip':
                    if (interaction.customId.includes('icon')) {
                        await handleSkipIcon(interaction, roleId);
                    }
                    break;

                case 'settings':
                    await handleSettingsButton(interaction);
                    break;

                default:
                    console.warn(`Unknown button interaction: ${interaction.customId}`);
                    await Logger.log('ERROR', {
                        guildId: interaction.guild.id,
                        type: 'UNKNOWN_BUTTON',
                        buttonId: interaction.customId,
                        userId: interaction.user.id,
                        timestamp: '2025-01-15 10:12:40'
                    });
            }
        } catch (error) {
            console.error('Error handling button interaction:', error);
            
            await interaction.reply({
                embeds: [
                    new CustomEmbedBuilder()
                        .setError('Error', 'Terjadi kesalahan saat memproses interaksi.')
                ],
                ephemeral: true
            });

            await Logger.log('ERROR', {
                guildId: interaction.guild.id,
                type: 'BUTTON_ERROR',
                error: error.message,
                buttonId: interaction.customId,
                userId: interaction.user.id,
                timestamp: '2025-01-15 10:12:40'
            });
        }
    }
};

async function handleIconUpload(interaction, roleId) {
    const role = await interaction.guild.roles.fetch(roleId);
    if (!role) {
        return await interaction.reply({
            embeds: [
                new CustomEmbedBuilder()
                    .setError('Role Tidak Ditemukan', 'Role tidak ditemukan.')
            ],
            ephemeral: true
        });
    }

    const uploadEmbed = new CustomEmbedBuilder()
        .setInfo('Upload Icon', 
            '🖼️ Kirim URL gambar untuk icon role\n\n' +
            '**Ketentuan:**\n' +
            '• Format: PNG atau JPG\n' +
            '• Ukuran maksimal: 256KB\n' +
            '• Resolusi yang disarankan: 128x128 pixel');

    await interaction.update({
        embeds: [uploadEmbed],
        components: []
    });

    // Create message collector
    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ 
        filter, 
        max: 1,
        time: 60000 
    });

    collector.on('collect', async message => {
        const url = message.content;
        message.delete().catch(() => {});

        try {
            await role.setIcon(url);

            const successEmbed = new CustomEmbedBuilder()
                .setSuccess('Icon Diperbarui',
                    `✅ Icon untuk role ${role} berhasil diperbarui!`);

            await interaction.editReply({
                embeds: [successEmbed],
                components: []
            });

            await Logger.log('ROLE_UPDATE', {
                guildId: interaction.guild.id,
                type: 'ROLE_ICON_UPDATE',
                roleId: role.id,
                updatedBy: interaction.user.id,
                timestamp: '2025-01-15 10:12:40'
            });

        } catch (error) {
            const errorEmbed = new CustomEmbedBuilder()
                .setError('Upload Gagal',
                    '❌ Gagal mengupload icon. Pastikan:\n' +
                    '• URL valid dan dapat diakses\n' +
                    '• Format file PNG atau JPG\n' +
                    '• Ukuran file maksimal 256KB');

            await interaction.editReply({
                embeds: [errorEmbed],
                components: []
            });

            await Logger.log('ERROR', {
                guildId: interaction.guild.id,
                type: 'ROLE_ICON_ERROR',
                roleId: role.id,
                error: error.message,
                timestamp: '2025-01-15 10:12:40'
            });
        }
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            const timeoutEmbed = new CustomEmbedBuilder()
                .setWarning('Waktu Habis',
                    '⏰ Waktu upload icon telah habis.');

            interaction.editReply({
                embeds: [timeoutEmbed],
                components: []
            });
        }
    });
}

async function handleSkipIcon(interaction, roleId) {
    const role = await interaction.guild.roles.fetch(roleId);
    if (!role) {
        return await interaction.reply({
            embeds: [
                new CustomEmbedBuilder()
                    .setError('Role Tidak Ditemukan', 'Role tidak ditemukan.')
            ],
            ephemeral: true
        });
    }

    const successEmbed = new CustomEmbedBuilder()
        .setSuccess('Setup Selesai',
            '✅ Setup role test telah selesai!\n' +
            'Role akan otomatis dihapus sesuai durasi yang ditentukan.');

    await interaction.update({
        embeds: [successEmbed],
        components: []
    });

    await Logger.log('TEST_ROLE_SKIP_ICON', {
        guildId: interaction.guild.id,
        type: 'TEST_ROLE_SKIP_ICON',
        roleId: role.id,
        userId: interaction.user.id,
        timestamp: '2025-01-15 10:12:40'
    });
}

async function handleSettingsButton(interaction) {
    const action = interaction.customId.split('_')[1];

    switch(action) {
        case 'back':
            // Show main settings menu
            const settingsEmbed = new CustomEmbedBuilder()
                .setSettings('Pengaturan',
                    'Pilih pengaturan yang ingin diubah:')
                .addFields([
                    { name: '📝 Log Channel', value: 'Channel untuk log aktivitas bot', inline: true },
                    { name: '⚙️ Role Settings', value: 'Pengaturan role boost', inline: true },
                    { name: '⏱️ Duration Settings', value: 'Pengaturan durasi default', inline: true }
                ]);

            const settingsButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('settings_logs')
                        .setLabel('📝 Log Channel')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('settings_roles')
                        .setLabel('⚙️ Role Settings')
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

            await interaction.update({
                embeds: [settingsEmbed],
                components: [settingsButtons]
            });
            break;

        case 'close':
            const closeEmbed = new CustomEmbedBuilder()
                .setSuccess('Settings Ditutup', '✅ Menu pengaturan telah ditutup.');

            await interaction.update({
                embeds: [closeEmbed],
                components: []
            });
            break;

        case 'logs':
            // Handle log channel settings
            const logSettingsEmbed = new CustomEmbedBuilder()
                .setSettings('Log Channel Settings', 
                    'Atur channel untuk menyimpan log aktivitas bot.')
                .addFields([
                    { name: '📝 Current Log Channel', value: 'None', inline: true }
                ]);

            const logButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('settings_set_log')
                        .setLabel('Set Log Channel')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('settings_back')
                        .setLabel('↩️ Kembali')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.update({
                embeds: [logSettingsEmbed],
                components: [logButtons]
            });
            break;

        case 'roles':
            // Handle role settings
            const roleSettingsEmbed = new CustomEmbedBuilder()
                .setSettings('Role Settings',
                    'Atur pengaturan untuk role boost.')
                .addFields([
                    { name: '🎨 Default Color', value: '#F47FFF', inline: true },
                    { name: '⭐ Default Permissions', value: 'Send Messages, Read Messages', inline: true }
                ]);

            const roleButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('settings_edit_role')
                        .setLabel('Edit Default Settings')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('settings_back')
                        .setLabel('↩️ Kembali')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.update({
                embeds: [roleSettingsEmbed],
                components: [roleButtons]
            });
            break;

        case 'duration':
            // Handle duration settings
            const durationSettingsEmbed = new CustomEmbedBuilder()
                .setSettings('Duration Settings',
                    'Atur durasi default untuk test role.')
                .addFields([
                    { name: '⏱️ Default Duration', value: '1 minute', inline: true },
                    { name: '⌛ Maximum Duration', value: '24 hours', inline: true }
                ]);

            const durationButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('settings_edit_duration')
                        .setLabel('Edit Duration')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('settings_back')
                        .setLabel('↩️ Kembali')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.update({
                embeds: [durationSettingsEmbed],
                components: [durationButtons]
            });
            break;

        default:
            await Logger.log('ERROR', {
                guildId: interaction.guild.id,
                type: 'UNKNOWN_SETTINGS_BUTTON',
                action: action,
                userId: interaction.user.id,
                timestamp: '2025-01-15 10:14:29'
            });
    }
}