const { 
    SlashCommandBuilder, 
    ButtonBuilder, 
    ActionRowBuilder, 
    ButtonStyle 
} = require('discord.js');
const EmbedService = require('../utils/embed-builder');
const Logger = require('../utils/logger');
const config = require('../config');
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
            const leaderboardEmbed = EmbedService.createEmbed({
                title: `${config.EMOJIS.BOOST} Boost Leaderboard - ${interaction.guild.name}`,
                description: boosters.size ? 
                    `Total Booster: ${boosters.size} member\n\n${
                        Array.from(boosters.values())
                            .map((member, index) => 
                                `\`${(index + 1).toString().padStart(2, '0')}.\` <@${member.id}>\n┗━ Boost sejak: ${moment(member.premiumSince).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss')}`
                            ).join('\n\n')
                    }` : 
                    'Belum ada member yang boost server ini.',
                thumbnail: interaction.guild.iconURL({ dynamic: true }),
                color: config.EMBED_COLORS.BOOST,
                footer: {
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL({ dynamic: true })
                },
                timestamp: true
            });

            // Create close button
            const closeButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('close_leaderboard')
                        .setLabel('❌ Tutup')
                        .setStyle(ButtonStyle.Danger)
                );

            await interaction.reply({
                embeds: [leaderboardEmbed],
                components: [closeButton]
            });

            // Log command usage
            await Logger.log('COMMAND', {
                type: 'BOOST_LEADERBOARD',
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                boosterCount: boosters.size,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

        } catch (error) {
            console.error('Error in boost-leaderboard command:', error);
            await Logger.log('ERROR', {
                type: 'COMMAND_ERROR',
                command: 'boost-leaderboard',
                error: error.message,
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

            await interaction.reply({
                content: '❌ Terjadi kesalahan saat menampilkan leaderboard.',
                ephemeral: true
            });
        }
    }
};