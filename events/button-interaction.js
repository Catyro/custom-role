const { 
    ButtonBuilder, 
    ButtonStyle, 
    ActionRowBuilder,
    PermissionFlagsBits 
} = require('discord.js');
const EmbedBuilder = require('../utils/embed-builder');
const RoleManager = require('../utils/role-manager');
const Logger = require('../utils/logger');

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

            // Split button ID for dynamic handling
            const [action, command, ...params] = buttonId.split('_');

            switch(action) {
                case 'boost':
                    await handleBoostButtons(interaction, command, params);
                    break;

                case 'settings':
                    await handleSettingsButtons(interaction, command, params);
                    break;

                case 'role':
                    await handleRoleButtons(interaction, command, params);
                    break;

                case 'upload':
                case 'skip':
                    await handleIconButtons(interaction, action, params);
                    break;

                default:
                    console.warn(`Unknown button interaction: ${buttonId}`);
                    await Logger.log('ERROR', {
                        guildId: interaction.guild.id,
                        type: 'UNKNOWN_BUTTON',
                        buttonId: buttonId,
                        userId: interaction.user.id,
                        timestamp: '2025-01-15 08:58:51'
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
                error: error.message,
                buttonId: interaction.customId,
                userId: interaction.user.id,
                timestamp: '2025-01-15 08:58:51'
            });
        }
    }
};

async function handleSettingsButtons(interaction, command, params) {
    switch(command) {
        case 'logs':
            await handleViewLogs(interaction);
            break;

        case 'refresh':
            await handleRefreshLogs(interaction);
            break;

        case 'back':
            await handleBackToMenu(interaction);
            break;

        case 'close':
            await handleCloseMenu(interaction);
            break;

        case 'channel':
            await handleSetChannel(interaction);
            break;

        case 'roles':
            await handleListRoles(interaction);
            break;
    }
}

async function handleViewLogs(interaction) {
    const logs = await Logger.getFormattedLogs(interaction.guild.id, 15);
    
    const logsEmbed = new EmbedBuilder()
        .setTitle('📜 Riwayat Log')
        .setDescription(logs.length ? 
            logs.map(log => `${log.emoji} \`${log.timestamp}\` ${log.message}`).join('\n\n') :
            'Belum ada log yang tercatat.')
        .setColor(0x007bff);

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('settings_back')
                .setLabel('↩️ Kembali')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('settings_refresh')
                .setLabel('🔄 Refresh')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('settings_close')
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
        timestamp: '2025-01-15 08:58:51'
    });
}

async function handleBackToMenu(interaction) {
    const settingsEmbed = new EmbedBuilder()
        .setCustom('⚙️', 'Pengaturan Bot', 
            'Pilih menu di bawah ini untuk mengatur bot:', 0x007bff);

    const mainButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('settings_logs')
                .setLabel('📜 Riwayat Log')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('settings_channel')
                .setLabel('📌 Set Channel')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('settings_roles')
                .setLabel('👑 Custom Roles')
                .setStyle(ButtonStyle.Primary)
        );

    const closeButton = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('settings_close')
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

async function handleListRoles(interaction) {
    const roles = await RoleManager.getCustomRoles(interaction.guild);
    
    const rolesEmbed = new EmbedBuilder()
        .setTitle('👑 Daftar Custom Role')
        .setDescription(roles.length ? 
            roles.map(role => `${role.toString()} • ${role.members.size} member(s)`).join('\n\n') :
            'Belum ada custom role yang dibuat.')
        .setColor(0x007bff)
        .setFooter({ 
            text: `Total: ${roles.length} role`,
            iconURL: interaction.guild.iconURL({ dynamic: true })
        });

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('settings_back')
                .setLabel('↩️ Kembali')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('settings_roles_refresh')
                .setLabel('🔄 Refresh')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('settings_close')
                .setLabel('❌ Tutup')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.update({
        embeds: [rolesEmbed],
        components: [buttons]
    });
}

async function handleSetChannel(interaction) {
    // Implementation for set channel
    // This will be handled by the modal submit event
    await interaction.showModal({
        title: 'Set Channel Log',
        custom_id: 'set_channel_modal',
        components: [
            {
                type: 1,
                components: [
                    {
                        type: 4,
                        custom_id: 'channel_id',
                        label: 'ID Channel',
                        style: 1,
                        min_length: 1,
                        max_length: 20,
                        placeholder: 'Masukkan ID channel',
                        required: true
                    }
                ]
            }
        ]
    });
}
