const { 
    ChannelType, 
    ChannelSelectMenuBuilder, 
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const EmbedBuilder = require('../utils/embed-builder');
const Logger = require('../utils/logger');
const moment = require('moment-timezone');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return;

        try {
            switch(interaction.customId) {
                case 'view_logs':
                    await handleViewLogs(interaction);
                    break;
                case 'set_channel':
                    await handleSetChannel(interaction);
                    break;
                case 'list_roles':
                    await handleListRoles(interaction);
                    break;
                case 'close_settings':
                    await handleCloseSettings(interaction);
                    break;
                // Handle boost leaderboard buttons
                case interaction.customId.match(/^boost_(prev|next|refresh|close)/)?.input:
                    // These are handled in boost-leaderboard.js
                    break;
                default:
                    console.warn(`Unknown button interaction: ${interaction.customId}`);
            }
        } catch (error) {
            console.error('Error handling button interaction:', error);
            await interaction.reply({
                content: '❌ Terjadi kesalahan saat memproses tombol.',
                ephemeral: true
            });

            await Logger.log('ERROR', {
                guildId: interaction.guild.id,
                type: 'BUTTON_INTERACTION_ERROR',
                buttonId: interaction.customId,
                error: error.message,
                userId: interaction.user.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });
        }
    }
};

async function handleViewLogs(interaction) {
    try {
        const logs = await Logger.getFormattedLogs(interaction.guild.id, 15);
        
        const logsEmbed = new EmbedBuilder()
            .setTitle('📜 Riwayat Log')
            .setDescription(logs.length ? 
                logs.map(log => `${log.message}`).join('\n\n') :
                'Belum ada log yang tercatat.')
            .setColor(0x007bff)
            .setFooter({ 
                text: `${moment().tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss')} • Menampilkan 15 log terakhir`,
                iconURL: interaction.guild.iconURL({ dynamic: true })
            });

        const row = new ActionRowBuilder()
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
            components: [row]
        });

    } catch (error) {
        throw error;
    }
}

async function handleSetChannel(interaction) {
    try {
        const row = new ActionRowBuilder()
            .addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId('log_channel_select')
                    .setPlaceholder('Pilih channel untuk log')
                    .setChannelTypes(ChannelType.GuildText)
            );

        const controlButtons = new ActionRowBuilder()
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

        const embed = new EmbedBuilder()
            .setInfo('Set Channel Log', 
                'Pilih channel yang akan digunakan untuk mencatat aktivitas bot.\n' +
                'Channel yang dipilih harus dapat diakses oleh bot.');

        await interaction.update({
            embeds: [embed],
            components: [row, controlButtons]
        });

    } catch (error) {
        throw error;
    }
}

async function handleListRoles(interaction) {
    try {
        const customRoles = interaction.guild.roles.cache
            .filter(role => role.name.startsWith('[Custom]') || role.name.startsWith('[Test]'))
            .sort((a, b) => b.position - a.position);

        const rolesEmbed = new EmbedBuilder()
            .setTitle('👑 Daftar Custom Role')
            .setDescription(customRoles.size ? 
                customRoles.map(role => 
                    `${role} (${role.members.size} member)\n┗━ Dibuat: ${moment(role.createdAt).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss')}`
                ).join('\n\n') :
                'Tidak ada custom role yang aktif.')
            .setColor(0x007bff)
            .setFooter({ 
                text: `Total: ${customRoles.size} role • ${moment().tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss')}`,
                iconURL: interaction.guild.iconURL({ dynamic: true })
            });

        const row = new ActionRowBuilder()
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
            components: [row]
        });

    } catch (error) {
        throw error;
    }
}

async function handleCloseSettings(interaction) {
    try {
        await interaction.update({
            content: '✅ Menu ditutup',
            embeds: [],
            components: []
        });

        // Delete message after 3 seconds
        setTimeout(() => {
            interaction.message.delete().catch(() => {});
        }, 3000);

    } catch (error) {
        throw error;
    }
}
