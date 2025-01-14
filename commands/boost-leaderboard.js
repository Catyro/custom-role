const { 
    SlashCommandBuilder,
    EmbedBuilder 
} = require('discord.js');
const Logger = require('../utils/logger');
const RoleManager = require('../utils/role-manager');
const EmbedService = require('../utils/embed-builder');
const moment = require('moment-timezone');

// Fungsi untuk mendapatkan data boost
async function getBoostData(guild) {
    try {
        // Dapatkan semua member yang boost server
        const premiumMembers = guild.members.cache.filter(member => member.premiumSince !== null);
        
        // Urutkan berdasarkan tanggal boost
        const sortedBoosters = Array.from(premiumMembers.values()).sort((a, b) => {
            return a.premiumSince - b.premiumSince;
        });

        // Format data untuk leaderboard
        const boostData = sortedBoosters.map((member, index) => {
            return {
                position: index + 1,
                id: member.id,
                mention: `<@${member.id}>`,
                boostDate: member.premiumSince,
                boostDuration: Date.now() - member.premiumSince
            };
        });

        return {
            totalBoosts: guild.premiumSubscriptionCount || 0,
            boostLevel: guild.premiumTier,
            boosters: boostData
        };
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error getting boost data:`, error);
        throw error;
    }
}

// Fungsi untuk format durasi
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(months / 12);

    if (years > 0) return `${years} tahun`;
    if (months > 0) return `${months} bulan`;
    if (days > 0) return `${days} hari`;
    if (hours > 0) return `${hours} jam`;
    if (minutes > 0) return `${minutes} menit`;
    return `${seconds} detik`;
}

// Fungsi untuk membuat embed leaderboard
async function createLeaderboardEmbed(guild) {
    try {
        const boostData = await getBoostData(guild);
        const maxDisplay = 10; // Maksimal 10 boosters yang ditampilkan

        const embed = new EmbedBuilder()
            .setColor(0xf47fff)
            .setTitle('🚀 Server Boost Leaderboard')
            .setDescription([
                `**Server Level:** ${['0️⃣', '1️⃣', '2️⃣', '3️⃣'][boostData.boostLevel]}`,
                `**Total Boosts:** ${boostData.totalBoosts}`,
                '',
                boostData.boosters.length ? '' : '*Tidak ada boosters saat ini.*'
            ].join('\n'));

        // Tambahkan field untuk setiap booster
        boostData.boosters.slice(0, maxDisplay).forEach((booster, index) => {
            const duration = formatDuration(booster.boostDuration);
            const position = ['🥇', '🥈', '🥉'][index] || `${index + 1}.`;
            
            embed.addFields({
                name: `${position} ${booster.mention}`,
                value: `> Boosting selama: **${duration}**\n> Sejak: <t:${Math.floor(booster.boostDate.getTime() / 1000)}:R>`,
                inline: false
            });
        });

        embed.setTimestamp()
            .setFooter({ 
                text: `Server Boost Status • ${guild.name}`,
                iconURL: guild.iconURL({ dynamic: true })
            });

        return embed;
    } catch (error) {
        console.error(`[2025-01-14 09:16:41] Error creating leaderboard embed:`, error);
        throw error;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('boost-leaderboard')
        .setDescription('Menampilkan leaderboard server booster'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const embed = await createLeaderboardEmbed(interaction.guild);
            
            // Tambahkan tombol Refresh dan Close
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('refresh_boost')
                        .setLabel('Refresh')
                        .setEmoji('🔄')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('close_boost')
                        .setLabel('Close')
                        .setEmoji('✖️')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.editReply({ 
                embeds: [embed],
                components: [row]
            });

            // Log command execution
            await Logger.log('COMMAND_EXECUTE', {
                command: 'boost-leaderboard',
                userId: interaction.user.id,
                user: `<@${interaction.user.id}>`,
                timestamp: '2025-01-14 09:16:41'
            });
        } catch (error) {
            console.error(`[2025-01-14 09:16:41] Error in boost-leaderboard command:`, error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Error')
                .setDescription('Terjadi kesalahan saat mengambil data server boost.')
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });

            // Log error
            await Logger.log('ERROR', {
                command: 'boost-leaderboard',
                userId: interaction.user.id,
                user: `<@${interaction.user.id}>`,
                error: error.message,
                timestamp: '2025-01-14 09:16:41'
            });
        }
    }
};