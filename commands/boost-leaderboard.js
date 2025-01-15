const { 
    SlashCommandBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ActionRowBuilder 
} = require('discord.js');
const EmbedBuilder = require('../utils/embed-builder');
const Logger = require('../utils/logger');
const moment = require('moment');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('boost-leaderboard')
        .setDescription('Menampilkan leaderboard server booster.')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Halaman leaderboard')
                .setMinValue(1)),

    async execute(interaction) {
        try {
            // Get premium members
            const premiumMembers = interaction.guild.members.cache
                .filter(member => member.premiumSince)
                .sort((a, b) => a.premiumSince - b.premiumSince);

            if (!premiumMembers.size) {
                return await interaction.reply({
                    content: '❌ Belum ada member yang boost server ini.',
                    ephemeral: true
                });
            }

            const itemsPerPage = 10;
            const maxPages = Math.ceil(premiumMembers.size / itemsPerPage);
            let currentPage = interaction.options.getInteger('page') || 1;

            if (currentPage > maxPages) {
                currentPage = maxPages;
            }

            await showBoostLeaderboard(interaction, premiumMembers, currentPage, maxPages, itemsPerPage);

        } catch (error) {
            console.error('Error executing boost leaderboard command:', error);
            await Logger.log('ERROR', {
                guildId: interaction.guild.id,
                type: 'BOOST_LEADERBOARD_ERROR',
                error: error.message,
                userId: interaction.user.id,
                timestamp: '2025-01-15 08:57:00'
            });

            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Terjadi kesalahan saat menampilkan leaderboard.',
                    ephemeral: true
                });
            }
        }
    }
};

async function showBoostLeaderboard(interaction, members, currentPage, maxPages, itemsPerPage) {
    try {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pageMembers = Array.from(members.values()).slice(start, end);

        const embed = new EmbedBuilder()
            .setCustom('🚀', 'Server Boost Leaderboard',
                `Daftar member yang telah boost server.\nTotal: ${members.size} booster(s)`)
            .setFooter({ 
                text: `Halaman ${currentPage} dari ${maxPages}`,
                iconURL: interaction.guild.iconURL({ dynamic: true })
            });

        // Add member list
        const list = pageMembers.map((member, index) => {
            const position = start + index + 1;
            const boostDate = moment(member.premiumSince).format('DD/MM/YYYY');
            return `${position}. ${member.toString()} • Boost sejak ${boostDate}`;
        }).join('\n\n');

        embed.setDescription(list || 'Tidak ada data untuk halaman ini.');

        // Create navigation buttons
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`boost_prev_${currentPage}`)
                .setLabel('◀️ Sebelumnya')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 1),
            new ButtonBuilder()
                .setCustomId(`boost_refresh_${currentPage}`)
                .setLabel('🔄 Refresh')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`boost_next_${currentPage}`)
                .setLabel('Selanjutnya ▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === maxPages),
            new ButtonBuilder()
                .setCustomId('boost_close')
                .setLabel('❌ Tutup')
                .setStyle(ButtonStyle.Danger)
        );

        const message = await interaction.reply({
            embeds: [embed],
            components: [row],
            fetchReply: true
        });

        // Create button collector
        const collector = message.createMessageComponentCollector({
            time: 300000 // 5 minutes
        });

        collector.on('collect', async (i) => {
            try {
                if (i.user.id !== interaction.user.id) {
                    return await i.reply({
                        content: '❌ Kamu tidak dapat menggunakan tombol ini.',
                        ephemeral: true
                    });
                }

                const [action, , page] = i.customId.split('_');
                let newPage = parseInt(page);

                switch(action) {
                    case 'boost':
                        switch(i.customId.split('_')[1]) {
                            case 'prev':
                                newPage = Math.max(1, currentPage - 1);
                                await showBoostLeaderboard(i, members, newPage, maxPages, itemsPerPage);
                                break;

                            case 'next':
                                newPage = Math.min(maxPages, currentPage + 1);
                                await showBoostLeaderboard(i, members, newPage, maxPages, itemsPerPage);
                                break;

                            case 'refresh':
                                await showBoostLeaderboard(i, members, currentPage, maxPages, itemsPerPage);
                                break;

                            case 'close':
                                await i.update({
                                    content: '✅ Menu ditutup',
                                    embeds: [],
                                    components: []
                                });

                                // Delete message after 3 seconds
                                setTimeout(() => {
                                    if (message && !message.deleted) {
                                        message.delete().catch(() => {});
                                    }
                                }, 3000);
                                break;
                        }
                        break;
                }

            } catch (error) {
                console.error('Error handling boost leaderboard interaction:', error);
                await Logger.log('ERROR', {
                    guildId: interaction.guild.id,
                    type: 'BOOST_LEADERBOARD_INTERACTION_ERROR',
                    error: error.message,
                    userId: i.user.id,
                    timestamp: '2025-01-15 08:57:00'
                });

                await i.reply({
                    content: '❌ Terjadi kesalahan saat memproses interaksi.',
                    ephemeral: true
                });
            }
        });

        collector.on('end', () => {
            if (message && !message.deleted) {
                message.edit({
                    components: []
                }).catch(() => {});
            }
        });

    } catch (error) {
        throw error;
    }
}
