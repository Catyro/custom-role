const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Logger = require('../utils/logger');
const moment = require('moment-timezone');

// Utility functions for creating buttons
function createCloseButton() {
    return new ButtonBuilder()
        .setCustomId('close_menu')
        .setLabel('Close')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌');
}

function createBackButton() {
    return new ButtonBuilder()
        .setCustomId('settings_back')
        .setLabel('Back')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('⬅️');
}

// Fungsi untuk format footer yang konsisten
function getFooterText(interaction) {
    const jakarta = moment().tz('Asia/Jakarta');
    const date = jakarta.format('DD-MM-YYYY');
    const time = jakarta.format('h:mm A');
    return `${date} | Today at ${time} | ${interaction.user.tag}`;
}

async function handleListRoles(interaction, page = 0) {
    try {
        // Dapatkan semua role dan urutkan berdasarkan posisi
        const roles = interaction.guild.roles.cache
            .sort((a, b) => b.position - a.position);

        // Format role dengan member list
        const formattedRoles = roles.map(role => {
            const members = role.members
                .map(member => `- ${member.user.tag}`)
                .join('\n');
            return `${role} (${role.members.size} members)\n${members || '- Tidak ada member'}`;
        });

        // Split roles into chunks
        const itemsPerPage = 5; // Kurangi jumlah role per halaman karena ada list member
        const chunks = [];
        for (let i = 0; i < formattedRoles.length; i += itemsPerPage) {
            chunks.push(formattedRoles.slice(i, i + itemsPerPage));
        }

        if (chunks.length === 0) {
            return await interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xe74c3c)
                        .setTitle('❌ No Roles')
                        .setDescription('No roles found in this server.')
                        .setFooter({ 
                            text: getFooterText(interaction),
                            iconURL: interaction.client.user.displayAvatarURL()
                        })
                ],
                components: [new ActionRowBuilder().addComponents(createBackButton(), createCloseButton())]
            });
        }

        // Ensure page is within bounds
        page = Math.max(0, Math.min(page, chunks.length - 1));

        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`📋 Roles List (Page ${page + 1}/${chunks.length})`)
            .setDescription(chunks[page].join('\n\n'))
            .setFooter({ 
                text: getFooterText(interaction),
                iconURL: interaction.client.user.displayAvatarURL()
            });

        const buttons = [];
        
        // Add navigation buttons
        if (chunks.length > 1) {
            if (page > 0) {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(`list_roles_${page - 1}`)
                        .setLabel('Previous')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⬅️')
                );
            }

            if (page < chunks.length - 1) {
                buttons.push(
                    new ButtonBuilder()
                        .setCustomId(`list_roles_${page + 1}`)
                        .setLabel('Next')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('➡️')
                );
            }
        }

        // Add back and close buttons
        buttons.push(createBackButton(), createCloseButton());

        const row = new ActionRowBuilder().addComponents(buttons);

        await interaction.update({ embeds: [embed], components: [row] });
    } catch (error) {
        console.error('Error in list_roles:', error);
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle('❌ Error')
                    .setDescription('Terjadi kesalahan saat mengambil daftar role.')
                    .setFooter({ 
                        text: getFooterText(interaction),
                        iconURL: interaction.client.user.displayAvatarURL()
                    })
            ],
            components: [new ActionRowBuilder().addComponents(createBackButton(), createCloseButton())]
        });
    }
}

// Fungsi untuk format footer yang konsisten
function getFooterText(interaction) {
    const jakarta = moment().tz('Asia/Jakarta');
    const date = jakarta.format('DD-MM-YYYY');
    const time = jakarta.format('h:mm A');
    return `${date} | Today at ${time} | ${interaction.user.tag}`;
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return;

        try {
            if (interaction.customId.startsWith('list_roles_')) {
                const page = parseInt(interaction.customId.split('_')[2]);
                await handleListRoles(interaction, page);
                return;
            }

            switch (interaction.customId) {
                case 'view_logs':
                    await handleViewLogs(interaction);
                    break;
                case 'refresh_logs':
                    await handleViewLogs(interaction);
                    break;
                case 'set_log_channel':
                    await handleSetLogChannel(interaction);
                    break;
                case 'list_roles':
                    await handleListRoles(interaction, 0);
                    break;
                case 'settings_back':
                    await handleBack(interaction);
                    break;
                case 'close_menu':
                    await handleCloseMenu(interaction);
                    break;
                default:
                    console.warn(`Unknown button interaction: ${interaction.customId}`);
                    const errorEmbed = new EmbedBuilder()
                        .setColor(0xe74c3c)
                        .setTitle('❌ Error')
                        .setDescription('Unknown button interaction.')
                        .setFooter({ 
                            text: getFooterText(interaction),
                            iconURL: interaction.client.user.displayAvatarURL()
                        });

                    await interaction.reply({
                        embeds: [errorEmbed],
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error handling button interaction:', error);
            try {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle('❌ Error')
                    .setDescription('Terjadi kesalahan saat memproses permintaan.')
                    .setFooter({ 
                        text: getFooterText(interaction),
                        iconURL: interaction.client.user.displayAvatarURL()
                    });

                if (interaction.replied || interaction.deferred) {
                    await interaction.editReply({
                        embeds: [errorEmbed],
                        components: [new ActionRowBuilder().addComponents(createBackButton(), createCloseButton())]
                    });
                } else {
                    await interaction.reply({
                        embeds: [errorEmbed],
                        components: [new ActionRowBuilder().addComponents(createBackButton(), createCloseButton())],
                        ephemeral: true
                    });
                }
            } catch (e) {
                console.error('Error sending error message:', e);
            }
        }

        // Log the button interaction
        try {
            await Logger.log('BUTTON_INTERACTION', {
                buttonId: interaction.customId,
                userId: interaction.user.id,
                user: interaction.user.tag,
                guild: interaction.guild?.name || 'DM',
                channel: interaction.channel?.name || 'Unknown',
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });
        } catch (error) {
            console.error('Error logging button interaction:', error);
        }
    }
};
