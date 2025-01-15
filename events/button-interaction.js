const { 
    ButtonBuilder, 
    ActionRowBuilder, 
    ButtonStyle 
} = require('discord.js');
const Logger = require('../utils/logger');
const moment = require('moment-timezone');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return;

        try {
            switch (interaction.customId) {
                case 'view_logs':
                    await handleViewLogs(interaction);
                    break;
                case 'set_channel':
                    await handleSetChannel(interaction);
                    break;
                case 'list_roles':
                    await handleListRoles(interaction, 1);
                    break;
                case 'refresh_logs':
                    await handleViewLogs(interaction, true);
                    break;
                case 'close_settings':
                case 'close_menu':
                    await interaction.update({
                        content: '✅ Menu ditutup',
                        embeds: [],
                        components: [],
                        ephemeral: true
                    });
                    break;
                case 'back_to_menu':
                    await handleBackToMenu(interaction);
                    break;
                default:
                    if (interaction.customId.startsWith('list_roles_')) {
                        const page = parseInt(interaction.customId.split('_')[2]);
                        await handleListRoles(interaction, page);
                    }
                    break;
            }
        } catch (error) {
            console.error('Error handling button:', error);
            await interaction.reply({
                content: '❌ Terjadi kesalahan saat memproses tombol.',
                ephemeral: true
            });
        }
    }
};

async function handleViewLogs(interaction, isRefresh = false) {
    const logs = await Logger.getLogs(interaction.guild.id, 10);
    
    const logsEmbed = {
        title: '📜 Riwayat Log',
        description: logs.length ? 
            logs.map(log => `\`${moment(log.timestamp).format('DD/MM HH:mm')}\` ${log.type}: ${log.description}`).join('\n') :
            'Tidak ada log yang tersedia.',
        color: 0x007bff,
        timestamp: new Date(),
        footer: {
            text: `Last updated: ${moment().format('DD/MM HH:mm:ss')}`
        }
    };

    const navigationButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('refresh_logs')
                .setLabel('🔄 Refresh')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('back_to_menu')
                .setLabel('↩️ Kembali')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('close_menu')
                .setLabel('❌ Tutup')
                .setStyle(ButtonStyle.Danger)
        );

    if (isRefresh) {
        await interaction.update({
            embeds: [logsEmbed],
            components: [navigationButtons]
        });
    } else {
        await interaction.update({
            embeds: [logsEmbed],
            components: [navigationButtons]
        });
    }
}

async function handleSetChannel(interaction) {
    const channelSelectEmbed = {
        title: '📌 Pengaturan Channel Log',
        description: 'Pilih channel yang akan digunakan sebagai log bot.\nKlik tombol di bawah untuk memilih channel.',
        color: 0x007bff,
        timestamp: new Date()
    };

    const channelButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('select_channel')
                .setLabel('📌 Pilih Channel')
                .setStyle(ButtonStyle.Primary)
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

    await interaction.update({
        embeds: [channelSelectEmbed],
        components: [channelButtons, controlButtons]
    });
}

async function handleListRoles(interaction, page) {
    const roles = interaction.guild.roles.cache
        .filter(role => role.name.startsWith('[Custom]'))
        .sort((a, b) => b.position - a.position);
    
    const itemsPerPage = 10;
    const maxPage = Math.ceil(roles.size / itemsPerPage);
    
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentRoles = Array.from(roles.values()).slice(startIndex, endIndex);

    const rolesEmbed = {
        title: '👑 Daftar Custom Role',
        description: currentRoles.length ?
            currentRoles.map((role, i) => {
                const member = role.members.first();
                return `${startIndex + i + 1}. ${role} - ${member ? `<@${member.id}>` : 'Tidak ada member'}`;
            }).join('\n') :
            'Tidak ada custom role yang aktif.',
        color: 0x007bff,
        footer: { 
            text: `Halaman ${page}/${maxPage || 1} • Total: ${roles.size} role` 
        },
        timestamp: new Date()
    };

    const navigationButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`list_roles_${page - 1}`)
                .setLabel('⬅️ Sebelumnya')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page <= 1),
            new ButtonBuilder()
                .setCustomId(`list_roles_${page + 1}`)
                .setLabel('➡️ Selanjutnya')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= maxPage)
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

    await interaction.update({
        embeds: [rolesEmbed],
        components: [navigationButtons, controlButtons]
    });
}

async function handleBackToMenu(interaction) {
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

    const settingsEmbed = {
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
        color: 0x007bff,
        timestamp: new Date(),
        footer: {
            text: `Requested by ${interaction.user.tag}`
        }
    };

    await interaction.update({
        embeds: [settingsEmbed],
        components: [mainButtons, closeButton]
    });
}