const { 
    SlashCommandBuilder, 
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const CustomEmbedBuilder = require('../utils/embed-builder');
const Logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('boost-leaderboard')
        .setDescription('Menampilkan leaderboard server booster')
        .addBooleanOption(option =>
            option.setName('public')
                .setDescription('Tampilkan leaderboard untuk semua user?')
                .setRequired(false)),

    async execute(interaction) {
        try {
            const isPublic = interaction.options.getBoolean('public') ?? false;

            // Get all boosters
            const boosters = await getBoosters(interaction.guild);
            if (boosters.length === 0) {
                return await interaction.reply({
                    embeds: [
                        new CustomEmbedBuilder()
                            .setInfo('Tidak Ada Booster',
                                'Belum ada user yang boost server ini.')
                    ],
                    ephemeral: !isPublic
                });
            }

            // Create leaderboard pages
            const pages = createLeaderboardPages(boosters);
            let currentPage = 0;

            // Create embed for first page
            const embed = await createLeaderboardEmbed(pages[currentPage], currentPage + 1, pages.length);

            // Create navigation buttons
            const buttons = createNavigationButtons(currentPage, pages.length);

            const response = await interaction.reply({
                embeds: [embed],
                components: [buttons],
                ephemeral: !isPublic
            });

            // Create button collector
            const collector = response.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 300000 // 5 minutes
            });

            collector.on('collect', async i => {
                switch (i.customId) {
                    case 'first':
                        currentPage = 0;
                        break;
                    case 'previous':
                        currentPage = Math.max(0, currentPage - 1);
                        break;
                    case 'next':
                        currentPage = Math.min(pages.length - 1, currentPage + 1);
                        break;
                    case 'last':
                        currentPage = pages.length - 1;
                        break;
                }

                const newEmbed = await createLeaderboardEmbed(pages[currentPage], currentPage + 1, pages.length);
                const newButtons = createNavigationButtons(currentPage, pages.length);

                await i.update({
                    embeds: [newEmbed],
                    components: [newButtons]
                });
            });

            collector.on('end', () => {
                const expiredButtons = createNavigationButtons(currentPage, pages.length, true);
                interaction.editReply({
                    components: [expiredButtons]
                }).catch(console.error);
            });

            await Logger.log('COMMAND_EXECUTE', {
                guildId: interaction.guild.id,
                type: 'BOOST_LEADERBOARD_VIEW',
                userId: 'Catyro',
                isPublic: isPublic,
                timestamp: '2025-01-15 10:26:05'
            });

        } catch (error) {
            console.error('Error in boost-leaderboard command:', error);
            
            await interaction.reply({
                embeds: [
                    new CustomEmbedBuilder()
                        .setError('Error',
                            'Terjadi kesalahan saat menampilkan leaderboard.')
                ],
                ephemeral: true
            });

            await Logger.log('ERROR', {
                guildId: interaction.guild.id,
                type: 'BOOST_LEADERBOARD_ERROR',
                error: error.message,
                userId: 'Catyro',
                timestamp: '2025-01-15 10:26:05'
            });
        }
    }
};

/**
 * Get all boosters from guild
 */
async function getBoosters(guild) {
    const boosters = await guild.members.fetch();
    return boosters
        .filter(member => member.premiumSince)
        .sort((a, b) => {
            // Sort by boost date (oldest first)
            if (a.premiumSince === b.premiumSince) return 0;
            return a.premiumSince < b.premiumSince ? -1 : 1;
        })
        .map((member, index) => ({
            position: index + 1,
            id: member.id,
            tag: member.user.tag,
            avatar: member.user.displayAvatarURL({ dynamic: true }),
            boostDate: member.premiumSince,
            roles: member.roles.cache
                .filter(role => role.name.startsWith('[BOOST]'))
                .map(role => role.id)
        }));
}

/**
 * Create array of leaderboard pages
 */
function createLeaderboardPages(boosters, itemsPerPage = 10) {
    const pages = [];
    for (let i = 0; i < boosters.length; i += itemsPerPage) {
        pages.push(boosters.slice(i, i + itemsPerPage));
    }
    return pages;
}

/**
 * Create leaderboard embed for a page
 */
async function createLeaderboardEmbed(boosters, currentPage, totalPages) {
    const embed = new CustomEmbedBuilder()
        .setLeaderboard('🚀 Server Booster Leaderboard',
            `Menampilkan booster dari yang paling lama\nHalaman ${currentPage} dari ${totalPages}`);

    let description = '';
    for (const booster of boosters) {
        const roles = booster.roles.map(roleId => `<@&${roleId}>`).join(', ') || 'Tidak ada custom role';
        description += `**${booster.position}.** <@${booster.id}>\n`;
        description += `┗ Boost sejak: <t:${Math.floor(booster.boostDate.getTime() / 1000)}:R>\n`;
        description += `┗ Role: ${roles}\n\n`;
    }

    embed.setDescription(description || 'Tidak ada booster untuk ditampilkan.');
    return embed;
}

/**
 * Create navigation buttons
 */
function createNavigationButtons(currentPage, totalPages, disabled = false) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('first')
                .setLabel('⏪ First')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled || currentPage === 0),
            new ButtonBuilder()
                .setCustomId('previous')
                .setLabel('◀️ Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled || currentPage === 0),
            new ButtonBuilder()
                .setCustomId('next')
                .setLabel('Next ▶️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled || currentPage === totalPages - 1),
            new ButtonBuilder()
                .setCustomId('last')
                .setLabel('Last ⏩')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(disabled || currentPage === totalPages - 1)
        );
}