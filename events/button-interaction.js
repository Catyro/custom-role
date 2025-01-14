const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Logger = require('../utils/logger');
const moment = require('moment-timezone');

// Utility function untuk format footer yang konsisten
function getFormattedFooter(interaction) {
    const jakarta = moment().tz('Asia/Jakarta');
    const date = jakarta.format('DD-MM-YYYY');
    const time = jakarta.format('h:mm A');
    return `${date} | Today at ${time} | ${interaction.user.tag}`;
}

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
                const memberCount = role.members.size;
                return `${role} (**${memberCount}** members)`;
            });

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
                            text: getFormattedFooter(interaction),
                            iconURL: interaction.client.user.displayAvatarURL()
                        })
                ],
                components: [new ActionRowBuilder().addComponents(createBackButton(), createCloseButton())]
            });
        }

        page = Math.max(0, Math.min(page, chunks.length - 1));

        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle(`📋 Roles List (Page ${page + 1}/${chunks.length})`)
            .setDescription(chunks[page].join('\n\n'))
            .setFooter({ 
                text: getFormattedFooter(interaction),
                iconURL: interaction.client.user.displayAvatarURL()
            });

        const buttons = [];
        
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
                        text: getFormattedFooter(interaction),
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
                        text: getFormattedFooter(interaction),
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
            text: getFormattedFooter(interaction),
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
                        text: getFormattedFooter(interaction),
                        iconURL: interaction.client.user.displayAvatarURL()
                    });

                await interaction.editReply({
                    embeds: [successEmbed],
                    components: [new ActionRowBuilder().addComponents(createBackButton(), createCloseButton())]
                });

                await Logger.log('LOG_CHANNEL_SET', {
                    channelId: message.content.replace(/[<#>]/g, ''),
                    userId: interaction.user.id,
                    timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
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
                    text: getFormattedFooter(interaction),
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
                    text: getFormattedFooter(interaction),
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
        const logs = await Logger.getLogs(50);
        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('📋 Recent Logs')
            .setDescription(logs || '*No logs available.*')
            .setFooter({ 
                text: getFormattedFooter(interaction),
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
                        text: getFormattedFooter(interaction),
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
            .setDescription([
                'Welcome to the bot settings menu!',
                'Please select an option below:',
                '',
                '📋 **View Logs** - View recent bot activity',
                '📌 **Set Log Channel** - Configure logging channel',
                '👥 **List Roles** - View all server roles',
                '',
                '*Note: Some options require specific permissions.*'
            ].join('\n'))
            .setFooter({ 
                text: getFormattedFooter(interaction),
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

// Fungsi untuk format footer yang konsisten
function getFooterText(interaction) {
    const jakarta = moment().tz('Asia/Jakarta');
    const date = jakarta.format('DD-MM-YYYY');
    const time = jakarta.format('h:mm A');
    return `${date} | Today at ${time} | ${interaction.user.tag}`;
}

async function handleCloseMenu(interaction) {
    try {
        // Cek apakah bot memiliki izin untuk menghapus pesan
        const botMember = interaction.guild.members.me;
        if (!botMember.permissions.has(PermissionFlagsBits.ManageMessages)) {
            // Jika tidak punya izin, update pesan saja
            return await interaction.update({
                components: [],
                embeds: [
                    new EmbedBuilder()
                        .setDescription('Menu telah ditutup.')
                        .setColor(0x2f3136)
                        .setFooter({ 
                            text: getFooterText(interaction),
                            iconURL: interaction.client.user.displayAvatarURL()
                        })
                ]
            });
        }
        
        // Jika punya izin, coba hapus pesan
        await interaction.message.delete();
    } catch (error) {
        console.error('Error in handleCloseMenu:', error);
        await interaction.reply({
            content: 'Menu telah ditutup.',
            ephemeral: true
        });
    }
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
