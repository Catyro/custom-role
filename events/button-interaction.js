const { 
    ButtonBuilder, 
    ButtonStyle, 
    ActionRowBuilder,
    PermissionFlagsBits 
} = require('discord.js');
const EmbedBuilder = require('../utils/embed-builder');
const RoleManager = require('../utils/role-manager');
const Logger = require('../utils/logger');
const moment = require('moment');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return;

        try {
            const buttonId = interaction.customId;

            // Handle settings menu buttons
            if (buttonId.startsWith('settings_')) {
                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                    return await interaction.reply({
                        content: '❌ Kamu tidak memiliki izin untuk menggunakan menu ini.',
                        ephemeral: true
                    });
                }
            }

            switch(buttonId) {
                case 'view_logs':
                case 'refresh_logs':
                    await handleViewLogs(interaction);
                    break;

                case 'back_to_menu':
                    await handleBackToMenu(interaction);
                    break;

                case 'close_menu':
                case 'close_settings':
                    await handleCloseMenu(interaction);
                    break;

                case 'set_channel':
                    await handleSetChannel(interaction);
                    break;

                case 'list_roles':
                case 'refresh_roles':
                    await handleListRoles(interaction);
                    break;

                default:
                    // Handle dynamic button IDs
                    if (buttonId.startsWith('upload_icon_')) {
                        await handleIconUpload(interaction, buttonId.split('_')[2]);
                    }
                    else if (buttonId.startsWith('skip_icon_')) {
                        await handleSkipIcon(interaction, buttonId.split('_')[2]);
                    }
                    else {
                        console.warn(`Unknown button interaction: ${buttonId}`);
                        await Logger.log('ERROR', {
                            guildId: interaction.guild.id,
                            type: 'UNKNOWN_BUTTON',
                            buttonId: buttonId,
                            userId: interaction.user.id,
                            timestamp: '2025-01-15 08:44:38'
                        });
                    }
            }

        } catch (error) {
            console.error('Error handling button interaction:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Terjadi kesalahan saat memproses tombol.',
                    ephemeral: true
                });
            }

            await Logger.log('ERROR', {
                guildId: interaction.guild.id,
                type: 'BUTTON_INTERACTION_ERROR',
                error: error.message,
                buttonId: interaction.customId,
                userId: interaction.user.id,
                timestamp: '2025-01-15 08:44:38'
            });
        }
    }
};

async function handleViewLogs(interaction) {
    const logs = await Logger.getFormattedLogs(interaction.guild.id, 15);
    
    const logsEmbed = new EmbedBuilder()
        .setTitle('📜 Riwayat Log')
        .setDescription(logs.length ? 
            logs.map(log => `${log.emoji} \`${log.timestamp}\` ${log.message}`).join('\n\n') :
            'Belum ada log yang tercatat.')
        .setColor(0x007bff)
        .setFooter({ 
            text: `Total: ${logs.length} log • ${moment().utc().format('YYYY-MM-DD HH:mm:ss')}`,
            iconURL: interaction.guild.iconURL({ dynamic: true })
        });

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_menu')
                .setLabel('↩️ Kembali')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('refresh_logs')
                .setLabel('🔄 Refresh')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('close_menu')
                .setLabel('❌ Tutup')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.update({
        embeds: [logsEmbed],
        components: [buttons]
    });

    await Logger.log('BUTTON_CLICK', {
        guildId: interaction.guild.id,
        type: 'VIEW_LOGS',
        userId: interaction.user.id,
        timestamp: '2025-01-15 08:44:38'
    });
}

async function handleBackToMenu(interaction) {
    const settingsEmbed = new EmbedBuilder()
        .setCustom('⚙️', 'Pengaturan Bot', 
            'Pilih menu di bawah ini untuk mengatur bot:', 0x007bff);

    const mainButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('view_logs')
                .setLabel('📜 Riwayat Log')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('set_channel')
                .setLabel('📌 Set Channel')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('list_roles')
                .setLabel('👑 Custom Roles')
                .setStyle(ButtonStyle.Primary)
        );

    const closeButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('close_settings')
                .setLabel('❌ Tutup')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.update({
        embeds: [settingsEmbed],
        components: [mainButtons, closeButton]
    });

    await Logger.log('BUTTON_CLICK', {
        guildId: interaction.guild.id,
        type: 'BACK_TO_MENU',
        userId: interaction.user.id,
        timestamp: '2025-01-15 08:44:38'
    });
}

async function handleCloseMenu(interaction) {
    await interaction.update({
        content: '✅ Menu ditutup',
        embeds: [],
        components: []
    });

    // Delete message after 3 seconds
    setTimeout(() => {
        if (interaction.message && !interaction.message.deleted) {
            interaction.message.delete().catch(() => {});
        }
    }, 3000);

    await Logger.log('BUTTON_CLICK', {
        guildId: interaction.guild.id,
        type: 'CLOSE_MENU',
        userId: interaction.user.id,
        timestamp: '2025-01-15 08:44:38'
    });
}

async function handleIconUpload(interaction, roleId) {
    const role = await interaction.guild.roles.fetch(roleId);
    if (!role) {
        return await interaction.reply({
            content: '❌ Role tidak ditemukan.',
            ephemeral: true
        });
    }

    const uploadEmbed = new EmbedBuilder()
        .setInfo('Upload Icon', 
            'Kirim URL icon untuk role ini.\nFormat yang didukung: PNG, JPG, GIF');

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

            const successEmbed = new EmbedBuilder()
                .setSuccess('Icon Diperbarui',
                    `Icon untuk role ${role} berhasil diperbarui!`);

            await interaction.editReply({
                embeds: [successEmbed],
                components: []
            });

            await Logger.log('ROLE_UPDATE', {
                guildId: interaction.guild.id,
                type: 'ROLE_ICON_UPDATE',
                roleId: role.id,
                updatedBy: interaction.user.id,
                timestamp: '2025-01-15 08:44:38'
            });

        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setError('Error',
                    'Gagal mengupload icon. Pastikan URL valid dan format yang didukung.');

            await interaction.editReply({
                embeds: [errorEmbed],
                components: []
            });
        }
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            const timeoutEmbed = new EmbedBuilder()
                .setError('Timeout',
                    'Waktu upload icon telah habis.');

            interaction.editReply({
                embeds: [timeoutEmbed],
                components: []
            });
        }
    });
}

async function handleSkipIcon(interaction, roleId) {
    const successEmbed = new EmbedBuilder()
        .setSuccess('Selesai',
            'Setup role telah selesai!');

    await interaction.update({
        embeds: [successEmbed],
        components: []
    });

    await Logger.log('BUTTON_CLICK', {
        guildId: interaction.guild.id,
        type: 'SKIP_ICON',
        roleId: roleId,
        userId: interaction.user.id,
        timestamp: '2025-01-15 08:44:38'
    });
}
