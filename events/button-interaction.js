const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const Logger = require('../utils/logger');
const moment = require('moment-timezone');

// Fungsi untuk membuat tombol Close yang konsisten
function createCloseButton() {
    return new ButtonBuilder()
        .setCustomId('close_menu')
        .setLabel('Close')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌');
}

// Fungsi untuk membuat tombol Back yang konsisten
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

// Fungsi untuk kembali ke menu settings
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
                text: getFooterText(interaction),
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
        console.error('Error in handleBack:', error);
        await interaction.reply({
            content: 'Failed to return to settings menu.',
            ephemeral: true
        });
    }
}

async function handleViewLogs(interaction) {
    try {
        // Cek permission
        if (!interaction.member.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
            return interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xe74c3c)
                        .setTitle('❌ Akses Ditolak')
                        .setDescription('Anda tidak memiliki izin untuk melihat logs.')
                        .setFooter({ 
                            text: getFooterText(interaction),
                            iconURL: interaction.client.user.displayAvatarURL()
                        })
                ],
                components: [new ActionRowBuilder().addComponents(createBackButton(), createCloseButton())]
            });
        }

        // Ambil logs dari Logger
        const logs = await Logger.getLogs(10); // Ambil 10 log terakhir
        
        let description;
        if (logs && logs.length > 0) {
            description = logs.map(log => {
                return `**[${log.type}]** - ${log.timestamp}\n${formatLogData(log.data)}\n`;
            }).join('\n');
        } else {
            description = 'Tidak ada log yang tersedia.';
        }

        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('📋 Bot Logs')
            .setDescription(description)
            .setFooter({ 
                text: getFooterText(interaction),
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
        await handleError(interaction, 'Gagal mengambil logs.');
    }
}

async function handleSetLogChannel(interaction) {
    try {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.update({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xe74c3c)
                        .setTitle('❌ Akses Ditolak')
                        .setDescription('Anda tidak memiliki izin untuk mengatur log channel.')
                        .setFooter({ 
                            text: getFooterText(interaction),
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
                'Silakan ketik ID channel atau mention channel (#nama-channel) yang akan digunakan untuk logs.',
                '',
                '**Format yang diterima:**',
                '```',
                '1. ID Channel (contoh: 123456789012345678)',
                '2. Mention Channel (contoh: #logs)',
                '```',
                '',
                '*Ketik dalam chat untuk mengatur channel.*',
                '⏰ Waktu tersisa: 30 detik'
            ].join('\n'))
            .setFooter({ 
                text: getFooterText(interaction),
                iconURL: interaction.client.user.displayAvatarURL()
            });

        await interaction.update({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(createBackButton(), createCloseButton())]
        });

        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

        collector.on('collect', async message => {
            try {
                // Hapus pesan user
                await message.delete().catch(() => {});

                // Extract channel ID dari mention atau ID langsung
                let channelId = message.content.replace(/[<#>]/g, '');
                const channel = interaction.guild.channels.cache.get(channelId);

                if (!channel) {
                    throw new Error('Channel tidak ditemukan');
                }

                // Cek permission bot di channel tersebut
                if (!channel.permissionsFor(interaction.guild.members.me).has([
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages
                ])) {
                    throw new Error('Bot tidak memiliki akses ke channel tersebut');
                }

                // Set log channel
                await Logger.setLogChannel(channel.id);

                const successEmbed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('✅ Log Channel Berhasil Diatur')
                    .setDescription(`Log channel telah diatur ke ${channel}`)
                    .setFooter({ 
                        text: getFooterText(interaction),
                        iconURL: interaction.client.user.displayAvatarURL()
                    });

                await interaction.editReply({
                    embeds: [successEmbed],
                    components: [new ActionRowBuilder().addComponents(createBackButton(), createCloseButton())]
                });

                // Kirim test message ke channel
                await channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x3498db)
                            .setTitle('✅ Log Channel Test')
                            .setDescription('Channel ini telah diatur sebagai log channel.')
                            .setFooter({ 
                                text: getFooterText(interaction),
                                iconURL: interaction.client.user.displayAvatarURL()
                            })
                    ]
                });
            } catch (error) {
                await handleError(interaction, `Gagal mengatur log channel: ${error.message}`);
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle('⏰ Waktu Habis')
                    .setDescription('Waktu pengaturan log channel telah habis.')
                    .setFooter({ 
                        text: getFooterText(interaction),
                        iconURL: interaction.client.user.displayAvatarURL()
                    });

                interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: [new ActionRowBuilder().addComponents(createBackButton(), createCloseButton())]
                });
            }
        });
    } catch (error) {
        console.error('Error in set_log_channel:', error);
        await handleError(interaction, 'Gagal memulai pengaturan log channel.');
    }
}

async function handleListRoles(interaction, page = 0) {
    try {
        // Get all roles and sort them by position (highest first)
        const roles = interaction.guild.roles.cache
            .sort((a, b) => b.position - a.position)
            .filter(role => !role.managed); // Filter out managed roles (bot roles)

        // Format role information
        const formattedRoles = await Promise.all(roles.map(async role => {
            const members = role.members.map(member => member.user.tag).sort();
            return `${role} (${members.length} members)\n${members.map(m => `- ${m}`).join('\n')}`;
        }));

        // Split into pages
        const itemsPerPage = 5;
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
                        .setDescription('Tidak ada role yang ditemukan di server ini.')
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
            .setTitle(`👥 Role List (Page ${page + 1}/${chunks.length})`)
            .setDescription(chunks[page].join('\n\n'))
            .setFooter({ 
                text: getFooterText(interaction),
                iconURL: interaction.client.user.displayAvatarURL()
            });

        const buttons = [];
        
        // Add navigation buttons if needed
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
        await handleError(interaction, 'Gagal mengambil daftar role.');
    }
}

// Helper function untuk format log data
function formatLogData(data) {
    if (!data) return 'No data';
    
    return Object.entries(data)
        .map(([key, value]) => `**${key}:** ${value}`)
        .join('\n');
}

// Helper function untuk handle error
async function handleError(interaction, message) {
    const errorEmbed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('❌ Error')
        .setDescription(message)
        .setFooter({ 
            text: getFooterText(interaction),
            iconURL: interaction.client.user.displayAvatarURL()
        });

    try {
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
    } catch (error) {
        console.error('Error sending error message:', error);
    }
}

async function handleViewLogs(interaction) {
    try {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
            return await handleError(interaction, 'Anda tidak memiliki izin untuk melihat log.');
        }

        // Ambil log terakhir (contoh)
        const logs = [
            'User A joined the server',
            'User B sent a message',
            'User C left the server'
        ];

        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('📋 Bot Logs')
            .setDescription(logs.join('\n') || 'Tidak ada log yang tersedia.')
            .setFooter({ 
                text: getFooterText(interaction),
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
        await handleError(interaction, 'Terjadi kesalahan saat mengambil log.');
    }
}

async function handleSetLogChannel(interaction) {
    try {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return await handleError(interaction, 'Anda tidak memiliki izin untuk mengatur log channel.');
        }

        const embed = new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle('📌 Set Log Channel')
            .setDescription([
                'Silakan ketik ID channel atau mention channel (#nama-channel) yang ingin dijadikan log channel.',
                '',
                '**Format:**',
                '- ID Channel: 123456789012345678',
                '- Mention: #nama-channel',
                '',
                '⏰ Waktu: 30 detik'
            ].join('\n'))
            .setFooter({ 
                text: getFooterText(interaction),
                iconURL: interaction.client.user.displayAvatarURL()
            });

        const row = new ActionRowBuilder()
            .addComponents(createBackButton(), createCloseButton());

        await interaction.update({ embeds: [embed], components: [row] });

        const filter = m => m.author.id === interaction.user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

        collector.on('collect', async message => {
            try {
                await message.delete().catch(() => {});
                let channelId = message.content.replace(/[<#>]/g, '');
                const channel = interaction.guild.channels.cache.get(channelId);

                if (!channel) {
                    throw new Error('Channel tidak ditemukan!');
                }

                if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.SendMessages)) {
                    throw new Error('Bot tidak memiliki izin untuk mengirim pesan di channel tersebut!');
                }

                // Set log channel (ganti dengan fungsi yang sesuai)
                // await Logger.setLogChannel(channel.id);

                const successEmbed = new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('✅ Log Channel Berhasil Diatur')
                    .setDescription(`Log channel telah diatur ke ${channel}`)
                    .setFooter({ 
                        text: getFooterText(interaction),
                        iconURL: interaction.client.user.displayAvatarURL()
                    });

                await interaction.editReply({
                    embeds: [successEmbed],
                    components: [new ActionRowBuilder().addComponents(createBackButton(), createCloseButton())]
                });

                // Kirim pesan test ke channel
                await channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0x3498db)
                            .setTitle('📌 Log Channel Test')
                            .setDescription('Channel ini telah diatur sebagai log channel!')
                            .setFooter({ 
                                text: getFooterText(interaction),
                                iconURL: interaction.client.user.displayAvatarURL()
                            })
                    ]
                });
            } catch (error) {
                await handleError(interaction, `Gagal mengatur log channel: ${error.message}`);
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle('⏰ Waktu Habis')
                    .setDescription('Waktu pengaturan log channel telah habis.')
                    .setFooter({ 
                        text: getFooterText(interaction),
                        iconURL: interaction.client.user.displayAvatarURL()
                    });

                interaction.editReply({
                    embeds: [timeoutEmbed],
                    components: [new ActionRowBuilder().addComponents(createBackButton(), createCloseButton())]
                });
            }
        });
    } catch (error) {
        console.error('Error in set_log_channel:', error);
        await handleError(interaction, 'Terjadi kesalahan saat mengatur log channel.');
    }
}

async function handleListRoles(interaction) {
    try {
        const roles = interaction.guild.roles.cache
            .sort((a, b) => b.position - a.position)
            .map(role => {
                const members = role.members.map(member => member.user.tag);
                return `${role} (${members.length} members)\n${members.map(m => `- ${m}`).join('\n')}`;
            });

        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('👥 Server Roles')
            .setDescription(roles.join('\n\n') || 'Tidak ada role.')
            .setFooter({ 
                text: getFooterText(interaction),
                iconURL: interaction.client.user.displayAvatarURL()
            });

        const row = new ActionRowBuilder()
            .addComponents(createBackButton(), createCloseButton());

        await interaction.update({ embeds: [embed], components: [row] });
    } catch (error) {
        console.error('Error in list_roles:', error);
        await handleError(interaction, 'Terjadi kesalahan saat mengambil daftar role.');
    }
}

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return;

        try {
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
                    await handleListRoles(interaction);
                    break;
                case 'settings_back':
                    await handleBack(interaction);
                    break;
                case 'close_menu':
                    await handleCloseMenu(interaction);
                    break;
                default:
                    console.warn(`Unknown button interaction: ${interaction.customId}`);
                    await handleError(interaction, 'Interaksi tidak dikenal.');
            }
        } catch (error) {
            console.error('Error handling button interaction:', error);
            await handleError(interaction, 'Terjadi kesalahan saat memproses permintaan.');
        }
    }
};
