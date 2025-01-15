const { 
    SlashCommandBuilder, 
    ButtonBuilder, 
    ActionRowBuilder, 
    ButtonStyle 
} = require('discord.js');
const EmbedBuilder = require('../utils/embed-builder');
const Logger = require('../utils/logger');
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('boost-leaderboard')
        .setDescription('Menampilkan daftar booster server'),

    async execute(interaction) {
        try {
            await showBoostLeaderboard(interaction, 1);
            
            // Log command execution
            await Logger.log('COMMAND_EXECUTE', {
                guildId: interaction.guild.id,
                type: 'BOOST_LEADERBOARD',
                userId: interaction.user.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });
        } catch (error) {
            console.error('Error in boost-leaderboard command:', error);
            await interaction.reply({
                content: '❌ Terjadi kesalahan saat menampilkan leaderboard.',
                ephemeral: true
            });

            await Logger.log('ERROR', {
                guildId: interaction.guild.id,
                type: 'BOOST_LEADERBOARD_ERROR',
                error: error.message,
                userId: interaction.user.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });
        }
    }
};

async function showBoostLeaderboard(interaction, page = 1) {
    const itemsPerPage = 10;
    const boosters = Array.from(interaction.guild.members.cache
        .filter(member => member.premiumSince)
        .sort((a, b) => a.premiumSince - b.premiumSince)
        .values());

    const maxPage = Math.ceil(boosters.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const currentBoosters = boosters.slice(startIndex, startIndex + itemsPerPage);

    const leaderboardEmbed = new EmbedBuilder()
        .setCustom('🌟', `Boost Leaderboard - ${interaction.guild.name}`,
            currentBoosters.length ? 
            `Total Booster: ${boosters.length} member\n\n${
                currentBoosters.map((member, index) => {
                    let medal = '';
                    const globalIndex = startIndex + index;
                    if (globalIndex === 0) medal = '🥇';
                    else if (globalIndex === 1) medal = '🥈';
                    else if (globalIndex === 2) medal = '🥉';
                    
                    const boostDate = moment(member.premiumSince).tz('Asia/Jakarta');
                    const boostDuration = moment.duration(moment().diff(boostDate));
                    const durationText = boostDuration.asDays() >= 1 
                        ? `${Math.floor(boostDuration.asDays())} hari` 
                        : `${Math.floor(boostDuration.asHours())} jam`;

                    return `${medal}\`${(globalIndex + 1).toString().padStart(2, '0')}.\` ${member}\n┣━ Boost sejak: ${boostDate.format('DD/MM/YYYY HH:mm:ss')}\n┗━ Durasi: ${durationText}`;
                }).join('\n\n')
            }` : 
            'Belum ada member yang boost server ini.',
            0xf47fff)
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setFooter({ 
            text: `Page ${page}/${maxPage || 1} • Total: ${boosters.length} booster • ${moment().tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss')}`,
            iconURL: interaction.guild.iconURL({ dynamic: true })
        });

    // Navigation buttons
    const navigationRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`boost_prev_${page}`)
                .setLabel('⬅️ Sebelumnya')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page <= 1),
            new ButtonBuilder()
                .setCustomId('boost_refresh')
                .setLabel('🔄 Refresh')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`boost_next_${page}`)
                .setLabel('➡️ Selanjutnya')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= maxPage || maxPage === 0)
        );

    const closeRow = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('close_boost')
                .setLabel('❌ Tutup')
                .setStyle(ButtonStyle.Danger)
        );

    const components = [navigationRow, closeRow];

    if (interaction.replied || interaction.deferred) {
        await interaction.update({ embeds: [leaderboardEmbed], components });
    } else {
        await interaction.reply({ embeds: [leaderboardEmbed], components });
    }

    // Create button collector
    const message = await interaction.fetchReply();
    const collector = message.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 300000 // 5 minutes
    });

    collector.on('collect', async i => {
        try {
            if (i.customId === 'boost_refresh') {
                await showBoostLeaderboard(interaction, page);
                await Logger.log('COMMAND_EXECUTE', {
                    guildId: interaction.guild.id,
                    type: 'BOOST_LEADERBOARD_REFRESH',
                    userId: i.user.id,
                    timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
                });
            } else if (i.customId.startsWith('boost_prev_')) {
                await showBoostLeaderboard(interaction, page - 1);
            } else if (i.customId.startsWith('boost_next_')) {
                await showBoostLeaderboard(interaction, page + 1);
            } else if (i.customId === 'close_boost') {
                await i.update({
                    content: '✅ Menu ditutup',
                    embeds: [],
                    components: []
                });

                // Delete message after 3 seconds
                setTimeout(() => {
                    message.delete().catch(() => {});
                }, 3000);

                await Logger.log('COMMAND_EXECUTE', {
                    guildId: interaction.guild.id,
                    type: 'BOOST_LEADERBOARD_CLOSED',
                    userId: i.user.id,
                    timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
                });
            }
        } catch (error) {
            console.error('Error handling boost leaderboard interaction:', error);
            await i.reply({
                content: '❌ Terjadi kesalahan saat memproses interaksi.',
                ephemeral: true
            });
        }
    });

    collector.on('end', async () => {
        if (!message.deleted) {
            await message.edit({ components: [] }).catch(() => {});
        }
    });
}
