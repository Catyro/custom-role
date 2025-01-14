const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Logger = require('../utils/logger');

const CURRENT_TIME = '2025-01-14 11:59:34';
const CURRENT_USER = 'Catyro';

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

async function handleListRoles(interaction, page = 0) {
    try {
        const roles = interaction.guild.roles.cache
            .sort((a, b) => b.position - a.position)
            .map(role => {
                const color = role.color === 0 ? '#000000' : `#${role.color.toString(16).padStart(6, '0')}`;
                return `<@&${role.id}>\n> Members: **${role.members.size}**\n> Color: \`${color}\``;
            });

        // Split roles into chunks of 15 to stay within embed limits
        const itemsPerPage = 15;
        const chunks = [];
        for (let i = 0; i < roles.length; i += itemsPerPage) {
            chunks.push(roles.slice(i, i + itemsPerPage));
        }

        if (chunks.length === 0) {
            return await interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xe74c3c)
                        .setTitle('❌ No Roles')
                        .setDescription('No roles found in this server.')
                        .setFooter({ 
                            text: `Current Time (UTC): ${CURRENT_TIME} | ${CURRENT_USER}`,
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
                text: `Total Roles: ${roles.length} | Current Time (UTC): ${CURRENT_TIME} | ${CURRENT_USER}`,
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
                        text: `Current Time (UTC): ${CURRENT_TIME} | ${CURRENT_USER}`,
                        iconURL: interaction.client.user.displayAvatarURL()
                    })
            ],
            components: [new ActionRowBuilder().addComponents(createBackButton(), createCloseButton())]
        });
    }
}

async function handleSetLogChannel(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle('❌ Akses Ditolak')
                    .setDescription('Anda tidak memiliki izin untuk mengatur log channel.')
                    .setFooter({ 
                        text: `Current Time (UTC): ${CURRENT_TIME} | ${CURRENT_USER}`,
                        iconURL: interaction.client.user.displayAvatarURL()
                    })
            ],
            components: [new ActionRowBuilder().addComponents(createBackButton(), createCloseButton())]
        });
    }

    const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('📌 Set Log Channel')
        .setDescription([
            'Silakan pilih atau buat channel untuk log.',
            'Ketik ID channel atau mention channel (#nama-channel).',
            '',
            '**Format yang diterima:**',
            '```',
            '1. ID Channel (123456789012345678)',
            '2. Mention Channel (#nama-channel)',
            '```',
            '',
            '⏰ Waktu: 30 detik'
        ].join('\n'))
        .setFooter({ 
            text: `Current Time (UTC): ${CURRENT_TIME} | ${CURRENT_USER}`,
            iconURL: interaction.client.user.displayAvatarURL()
        });

    const row = new ActionRowBuilder()
        .addComponents(createBackButton(), createCloseButton());

    const reply = await interaction.update({
        embeds: [embed],
        components: [row]
    });

    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ 
        filter, 
        time: 30000,
        max: 1 
    });

    collector.on('collect', async message => {
        try {
            await message.delete().catch(() => {});
            const success = await Logger.setLogChannel(message.content);

            if (success) {
                const successEmbed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('✅ Log Channel Set')
                    .setDescription(`Channel log telah diatur ke ${message.content}`)
                    .setFooter({ 
                        text: `Current Time (UTC): ${CURRENT_TIME} | ${CURRENT_USER}`,
                        iconURL: interaction.client.user.displayAvatarURL()
                    });

                await interaction.editReply({
                    embeds: [successEmbed],
                    components: [new ActionRowBuilder().addComponents(createBackButton(), createCloseButton())]
                });

                // Log the channel set
                await Logger.log('LOG_CHANNEL_SET', {
                    channelId: message.content.replace(/[<#>]/g, ''),
                    userId: interaction.user.id,
                    timestamp: CURRENT_TIME
                });
            } else {
                throw new Error('Failed to set log channel');
            }
        } catch (error) {
            console.error('Error setting log channel:', error);
            const errorEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Error')
                .setDescription('Terjadi kesalahan saat mengatur log channel.\nPastikan channel valid dan bot memiliki akses.')
                .setFooter({ 
                    text: `Current Time (UTC): ${CURRENT_TIME} | ${CURRENT_USER}`,
                    iconURL: interaction.client.user.displayAvatarURL()
                });

            await interaction.editReply({
                embeds: [errorEmbed],
                components: [new ActionRowBuilder().addComponents(createBackButton(), createCloseButton())]
            });
        }
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            const timeoutEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('⏰ Waktu Habis')
                .setDescription('Waktu pengaturan log channel telah habis.\nSilakan coba lagi.')
                .setFooter({ 
                    text: `Current Time (UTC): ${CURRENT_TIME} | ${CURRENT_USER}`,
                    iconURL: interaction.client.user.displayAvatarURL()
                });

            interaction.editReply({
                embeds: [timeoutEmbed],
                components: [new ActionRowBuilder().addComponents(createBackButton(), createCloseButton())]
            });
        }
    });
}

async function handleViewLogs(interaction) {
    try {
        const logs = await Logger.getLogs(50); // Get last 50 logs
        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('📋 Recent Logs')
            .setDescription(logs || '*No logs available.*')
            .setFooter({ 
                text: `Current Time (UTC): ${CURRENT_TIME} | ${CURRENT_USER}`,
                iconURL: interaction.client.user.displayAvatarURL()
            });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('refresh_logs')
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄'),
                createBackButton(),
                createCloseButton()
            );

        await interaction.update({ embeds: [embed], components: [row] });
    } catch (error) {
        console.error('Error in view_logs:', error);
        await interaction.update({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle('❌ Error')
                    .setDescription('Error retrieving logs.')
                    .setFooter({ 
                        text: `Current Time (UTC): ${CURRENT_TIME} | ${CURRENT_USER}`,
                        iconURL: interaction.client.user.displayAvatarURL()
                    })
            ],
            components: [new ActionRowBuilder().addComponents(createBackButton(), createCloseButton())]
        });
    }
}

async function handleBack(interaction) {
    try {
        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('⚙️ Bot Settings')
            .setDescription('Please select an option below:')
            .setFooter({ 
                text: `Current Time (UTC): ${CURRENT_TIME} | ${CURRENT_USER}`,
                iconURL: interaction.client.user.displayAvatarURL()
            });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('view_logs')
                    .setLabel('View Logs')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('set_log_channel')
                    .setLabel('Set Log Channel')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📌'),
                new ButtonBuilder()
                    .setCustomId('list_roles')
                    .setLabel('List Roles')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👥'),
                createCloseButton()
            );

        await interaction.update({ embeds: [embed], components: [row] });
    } catch (error) {
        console.error('Error in settings_back:', error);
        await interaction.reply({
            content: 'Failed to return to settings menu.',
            ephemeral: true
        });
    }
}

async function handleCloseMenu(interaction) {
    try {
        await interaction.message.delete();
    } catch (error) {
        console.error('Error deleting message:', error);
        await interaction.reply({
            content: 'Failed to close menu.',
            ephemeral: true
        });
    }
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return;

        const currentTime = '2025-01-14 12:02:09';
        const currentUser = 'Catyro';

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
                        .setTimestamp()
                        .setFooter({ 
                            text: `Current Time (UTC): ${currentTime} | ${currentUser}`,
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
                    .setTimestamp()
                    .setFooter({ 
                        text: `Current Time (UTC): ${currentTime} | ${currentUser}`,
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
            const Logger = require('../utils/logger');
            await Logger.log('BUTTON_INTERACTION', {
                buttonId: interaction.customId,
                userId: interaction.user.id,
                user: interaction.user.tag,
                timestamp: currentTime,
                guild: interaction.guild?.name || 'DM',
                channel: interaction.channel?.name || 'Unknown'
            });
        } catch (error) {
            console.error('Error logging button interaction:', error);
        }
    }
};