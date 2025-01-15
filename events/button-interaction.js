const { 
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const EmbedBuilder = require('../utils/embed-builder');
const Logger = require('../utils/logger');
const moment = require('moment');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return;

        try {
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;
            const buttonId = interaction.customId;

            switch(buttonId) {
                case 'view_logs':
                    await handleViewLogs(interaction);
                    logButtonClick('VIEW_LOGS', userId, guildId);
                    break;

                case 'refresh_logs':
                    await handleViewLogs(interaction);
                    logButtonClick('REFRESH_LOGS', userId, guildId);
                    break;

                case 'set_channel':
                    await handleSetChannel(interaction);
                    logButtonClick('SET_CHANNEL', userId, guildId);
                    break;

                case 'list_roles':
                    await handleListRoles(interaction);
                    logButtonClick('LIST_ROLES', userId, guildId);
                    break;

                case 'back_to_menu':
                    await handleBackToMenu(interaction);
                    logButtonClick('BACK_TO_MENU', userId, guildId);
                    break;

                case 'close_menu':
                case 'close_settings':
                    await handleCloseMenu(interaction);
                    logButtonClick('CLOSE_MENU', userId, guildId);
                    break;

                case 'log_channel_select':
                    await handleChannelSelect(interaction);
                    logButtonClick('CHANNEL_SELECT', userId, guildId);
                    break;

                case 'refresh_roles':
                    await handleListRoles(interaction);
                    logButtonClick('REFRESH_ROLES', userId, guildId);
                    break;

                default:
                    // Handle boost leaderboard buttons
                    if (buttonId.match(/^boost_(prev|next|refresh|close)/)) {
                        // These are handled in boost-leaderboard.js
                        return;
                    }
                    console.warn(`Unknown button interaction: ${buttonId}`);
                    await Logger.log('ERROR', {
                        guildId: guildId,
                        type: 'UNKNOWN_BUTTON',
                        buttonId: buttonId,
                        userId: userId,
                        timestamp: moment().utc().format('YYYY-MM-DD HH:mm:ss')
                    });
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
                buttonId: interaction.customId,
                error: error.message,
                userId: interaction.user.id,
                timestamp: moment().utc().format('YYYY-MM-DD HH:mm:ss')
            });
        }
    }
};

async function logButtonClick(type, userId, guildId) {
    await Logger.log('BUTTON_CLICK', {
        guildId: guildId,
        type: type,
        userId: userId,
        timestamp: moment().utc().format('YYYY-MM-DD HH:mm:ss')
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
}

async function handleChannelSelect(interaction) {
    const channel = interaction.channels.first();
    if (!channel) {
        return await interaction.reply({
            content: '❌ Channel tidak valid.',
            ephemeral: true
        });
    }

    // Check bot permissions in the channel
    const permissions = channel.permissionsFor(interaction.client.user);
    if (!permissions.has(['ViewChannel', 'SendMessages', 'EmbedLinks'])) {
        return await interaction.reply({
            content: '❌ Bot tidak memiliki izin yang cukup di channel tersebut.',
            ephemeral: true
        });
    }

    // Save channel setting
    // ... kode untuk menyimpan channel ke config

    const successEmbed = new EmbedBuilder()
        .setSuccess('Channel Log Diatur', `Channel log telah diatur ke ${channel}`);

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_menu')
                .setLabel('↩️ Kembali')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('close_menu')
                .setLabel('❌ Tutup')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.update({
        embeds: [successEmbed],
        components: [buttons]
    });

    await Logger.log('CHANNEL_SET', {
        guildId: interaction.guild.id,
        type: 'LOG_CHANNEL_UPDATE',
        channelId: channel.id,
        userId: interaction.user.id,
        timestamp: moment().utc().format('YYYY-MM-DD HH:mm:ss')
    });
}
