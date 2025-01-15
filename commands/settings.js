const { 
    SlashCommandBuilder, 
    PermissionFlagsBits,
    ChannelSelectMenuBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType
} = require('discord.js');
const EmbedBuilder = require('../utils/embed-builder');
const Logger = require('../utils/logger');
const moment = require('moment');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Pengaturan bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        try {
            await showMainMenu(interaction);

            await Logger.log('COMMAND_EXECUTE', {
                guildId: interaction.guild.id,
                type: 'SETTINGS',
                userId: interaction.user.id,
                timestamp: moment().utc().format('YYYY-MM-DD HH:mm:ss')
            });
        } catch (error) {
            console.error('Error in settings command:', error);
            await interaction.reply({
                content: '❌ Terjadi kesalahan saat menampilkan menu pengaturan.',
                ephemeral: true
            });

            await Logger.log('ERROR', {
                guildId: interaction.guild.id,
                type: 'SETTINGS_ERROR',
                error: error.message,
                userId: interaction.user.id,
                timestamp: moment().utc().format('YYYY-MM-DD HH:mm:ss')
            });
        }
    }
};

async function showMainMenu(interaction) {
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

    await interaction.reply({
        embeds: [settingsEmbed],
        components: [mainButtons, closeButton],
        ephemeral: true
    });
}

// Handle Logs View
async function handleViewLogs(interaction) {
    const logs = await Logger.getFormattedLogs(interaction.guild.id, 15);
    
    const logsEmbed = new EmbedBuilder()
        .setTitle('📜 Riwayat Log')
        .setDescription(logs.length ? 
            logs.map(log => log.message).join('\n\n') :
            'Belum ada log yang tercatat.')
        .setColor(0x007bff)
        .setFooter({ 
            text: `Total: ${logs.length} log`,
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
}

// Handle Channel Setting
async function handleSetChannel(interaction) {
    const channelSelect = new ActionRowBuilder()
        .addComponents(
            new ChannelSelectMenuBuilder()
                .setCustomId('log_channel_select')
                .setPlaceholder('Pilih channel untuk log')
                .setChannelTypes(ChannelType.GuildText)
        );

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

    const channelEmbed = new EmbedBuilder()
        .setTitle('📌 Set Channel Log')
        .setDescription('Pilih channel yang akan digunakan untuk mencatat aktivitas bot.')
        .setColor(0x007bff);

    await interaction.update({
        embeds: [channelEmbed],
        components: [channelSelect, buttons]
    });
}

// Handle Custom Roles List
async function handleListRoles(interaction) {
    const customRoles = interaction.guild.roles.cache
        .filter(role => role.name.startsWith('[Custom]') || role.name.startsWith('[Test]'))
        .sort((a, b) => b.position - a.position);

    const rolesEmbed = new EmbedBuilder()
        .setTitle('👑 Daftar Custom Role')
        .setDescription(customRoles.size ? 
            customRoles.map(role => 
                `${role} (${role.members.size} member)`
            ).join('\n\n') :
            'Tidak ada custom role yang aktif.')
        .setColor(0x007bff)
        .setFooter({ 
            text: `Total: ${customRoles.size} role`,
            iconURL: interaction.guild.iconURL({ dynamic: true })
        });

    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('back_to_menu')
                .setLabel('↩️ Kembali')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('refresh_roles')
                .setLabel('🔄 Refresh')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('close_menu')
                .setLabel('❌ Tutup')
                .setStyle(ButtonStyle.Danger)
        );

    await interaction.update({
        embeds: [rolesEmbed],
        components: [buttons]
    });
}
