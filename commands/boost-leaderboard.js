const { 
    SlashCommandBuilder, 
    ButtonBuilder, 
    ActionRowBuilder, 
    ButtonStyle 
} = require('discord.js');
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('boost-leaderboard')
        .setDescription('Menampilkan daftar booster server'),

    async execute(interaction) {
        try {
            // Get all boosters and sort by boost date
            const boosters = await interaction.guild.members.cache
                .filter(member => member.premiumSince)
                .sort((a, b) => a.premiumSince - b.premiumSince);

            // Create leaderboard embed
            const leaderboardEmbed = {
                title: `🌟 Boost Leaderboard - ${interaction.guild.name}`,
                description: boosters.size ? 
                    `Total Booster: ${boosters.size} member\n\n${
                        Array.from(boosters.values())
                            .map((member, index) => {
                                let medal = '';
                                if (index === 0) medal = '🥇';
                                else if (index === 1) medal = '🥈';
                                else if (index === 2) medal = '🥉';
                                
                                return `${medal}\`${(index + 1).toString().padStart(2, '0')}.\` <@${member.id}>\n┗━ Boost sejak: ${moment(member.premiumSince).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss')}`;
                            }).join('\n\n')
                    }` : 
                    'Belum ada member yang boost server ini.',
                thumbnail: {
                    url: interaction.guild.iconURL({ dynamic: true })
                },
                color: 0xf47fff,
                footer: {
                    text: `Requested by ${interaction.user.tag}`,
                    icon_url: interaction.user.displayAvatarURL({ dynamic: true })
                },
                timestamp: new Date()
            };

            // Create close button
            const closeButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_leaderboard')
                        .setLabel('❌ Tutup')
                        .setStyle(ButtonStyle.Danger)
                );

            const message = await interaction.reply({
                embeds: [leaderboardEmbed],
                components: [closeButton],
                fetchReply: true
            });

            // Create button collector
            const collector = message.createMessageComponentCollector({
                filter: i => i.customId === 'close_leaderboard' && i.user.id === interaction.user.id,
                time: 60000
            });

            collector.on('collect', async i => {
                await i.update({
                    content: '✅ Leaderboard ditutup',
                    embeds: [],
                    components: [],
                    ephemeral: true
                });
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time') {
                    await message.edit({
                        components: []
                    }).catch(() => {});
                }
            });

        } catch (error) {
            console.error('Error in boost-leaderboard command:', error);
            await interaction.reply({
                content: '❌ Terjadi kesalahan saat menampilkan leaderboard.',
                ephemeral: true
            });
        }
    }
};