const { 
    ButtonBuilder, 
    ActionRowBuilder, 
    ButtonStyle 
} = require('discord.js');
const EmbedService = require('../utils/embed-builder');
const Logger = require('../utils/logger');
const config = require('../config');
const moment = require('moment-timezone');

// ... kode lainnya ...

async function handleSettingsButtons(interaction) {
    const buttonId = interaction.customId;
    const page = parseInt(interaction.customId.split('_')[2]) || 1;

    // Navigation buttons
    const navigationButtons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('settings_back')
                .setLabel('↩️ Kembali')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('settings_close')
                .setLabel('❌ Tutup')
                .setStyle(ButtonStyle.Danger)
        );

    switch (buttonId) {
        case 'view_logs':
            const logs = await Logger.getLogs(interaction.guild.id, 10);
            const logsEmbed = EmbedService.createEmbed({
                title: '📜 Riwayat Log',
                description: logs.length ? logs.map(log => 
                    `\`${moment(log.timestamp).format('DD/MM HH:mm:ss')}\` ${log.type}: ${log.description}`
                ).join('\n') : 'Tidak ada log yang tersedia.',
                color: config.EMBED_COLORS.INFO,
                footer: { text: 'Menampilkan 10 log terakhir' }
            });

            await interaction.update({
                embeds: [logsEmbed],
                components: [navigationButtons]
            });
            break;

        case 'set_log_channel':
            const channelSelectRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('settings_select_channel')
                        .setLabel('📌 Pilih Channel')
                        .setStyle(ButtonStyle.Primary)
                );

            const channelEmbed = EmbedService.createEmbed({
                title: '📌 Pengaturan Channel Log',
                description: 'Klik tombol di bawah untuk memilih channel yang akan digunakan sebagai log bot.',
                color: config.EMBED_COLORS.INFO
            });

            await interaction.update({
                embeds: [channelEmbed],
                components: [channelSelectRow, navigationButtons]
            });
            break;

        case 'list_roles':
            const roles = await getRolesList(interaction.guild, page);
            const maxPage = Math.ceil(roles.total / 10);

            const rolesEmbed = EmbedService.createEmbed({
                title: '👑 Daftar Custom Role',
                description: roles.items.length ? 
                    roles.items.map((role, i) => 
                        `${i + 1 + (page - 1) * 10}. ${role.toString()} - <@${role.members.first()?.id || 'Tidak ada'}>`
                    ).join('\n') : 
                    'Tidak ada custom role yang aktif.',
                color: config.EMBED_COLORS.PRIMARY,
                footer: { text: `Halaman ${page}/${maxPage || 1}` }
            });

            const roleButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`settings_roles_${page - 1}`)
                        .setLabel('⬅️ Sebelumnya')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page <= 1),
                    new ButtonBuilder()
                        .setCustomId(`settings_roles_${page + 1}`)
                        .setLabel('➡️ Selanjutnya')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(page >= maxPage)
                );

            await interaction.update({
                embeds: [rolesEmbed],
                components: [roleButtons, navigationButtons]
            });
            break;

        case 'settings_back':
            // Kembali ke menu utama
            const mainButtons = new ActionRowBuilder()
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

            const mainEmbed = EmbedService.createEmbed({
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
                color: config.EMBED_COLORS.PRIMARY
            });

            await interaction.update({
                embeds: [mainEmbed],
                components: [mainButtons]
            });
            break;

        case 'settings_close':
            await interaction.update({
                content: '✅ Menu pengaturan ditutup.',
                embeds: [],
                components: [],
                ephemeral: true
            });
            break;
    }
}

async function getRolesList(guild, page = 1) {
    const customRoles = guild.roles.cache
        .filter(role => role.name.startsWith('[Custom]'))
        .sort((a, b) => b.position - a.position);

    return {
        items: Array.from(customRoles.values())
            .slice((page - 1) * 10, page * 10),
        total: customRoles.size
    };
}