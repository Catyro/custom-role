const { 
    SlashCommandBuilder, 
    EmbedBuilder 
} = require('discord.js');
const moment = require('moment-timezone');
const config = require('../config');
const Logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('boost-leaderboard')
        .setDescription('Shows the server boost leaderboard'),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            // Get all boosters
            const boosters = interaction.guild.members.cache
                .filter(member => member.premiumSince)
                .sort((a, b) => a.premiumSinceTimestamp - b.premiumSinceTimestamp);

            if (!boosters.size) {
                return await interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(config.EMBED_COLORS.INFO)
                            .setTitle('📊 Server Boost Leaderboard')
                            .setDescription('No active boosters found!')
                            .setTimestamp()
                    ]
                });
            }

            // Create leaderboard
            const leaderboardEntries = boosters.map((member, index) => {
                const boostDuration = moment.duration(Date.now() - member.premiumSinceTimestamp);
                const months = boostDuration.months();
                const days = boostDuration.days();
                
                return `${index + 1}. ${member.user.tag}\n` +
                       `├ Since: ${moment(member.premiumSince).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm')}\n` +
                       `└ Duration: ${months ? `${months} months ` : ''}${days} days`;
            });

            // Split into pages if needed (10 entries per page)
            const pages = [];
            for (let i = 0; i < leaderboardEntries.length; i += 10) {
                pages.push(leaderboardEntries.slice(i, i + 10));
            }

            const embed = new EmbedBuilder()
                .setColor(config.EMBED_COLORS.DEFAULT)
                .setTitle('📊 Server Boost Leaderboard')
                .setDescription([
                    `Total Boosters: ${boosters.size}`,
                    `Server Level: ${interaction.guild.premiumTier}`,
                    `Boost Count: ${interaction.guild.premiumSubscriptionCount}`,
                    '\n**Top Boosters:**\n',
                    pages[0].join('\n\n')
                ].join('\n'))
                .setFooter({ text: `Page 1/${pages.length}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            // Log command usage
            await Logger.log('COMMAND', {
                type: 'BOOST_LEADERBOARD',
                userId: interaction.user.id,
                guildId: interaction.guild.id,
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

            await interaction.editReply({
                content: '❌ An error occurred while fetching the leaderboard.',
                ephemeral: true
            });
        }
    }
};