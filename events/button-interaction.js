const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const Logger = require('../utils/logger');
const moment = require('moment-timezone');

// Helper functions
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

function getFooterText(interaction) {
    const jakarta = moment().tz('Asia/Jakarta');
    const date = jakarta.format('DD-MM-YYYY');
    const time = jakarta.format('h:mm A');
    return `${date} | Today at ${time} | ${interaction.user.tag}`;
}

async function handleViewLogs(interaction) {
    try {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
            throw new Error('Anda tidak memiliki izin untuk melihat log.');
        }

        const logs = await Logger.getLogs(10); // Ambil 10 log terakhir
        
        const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('📋 Bot Logs')
            .setDescription(logs || 'Tidak ada log yang tersedia.')
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
        throw new Error(`Error melihat log: ${error.message}`);
    }
}

async function handleSetLogChannel(interaction) {
    try {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            throw new Error('Anda tidak memiliki izin untuk mengatur log channel.');
        }

        const embed = new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle('📌 Set Log Channel')
            .setDescription([
                'Silakan ketik ID channel atau mention channel (#nama-channel) yang ingin dijadikan log channel.',
                '',
                '**Format yang diterima:**',
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
                            .setTitle('📌 Log Channel Test')
                            .setDescription('Channel ini telah diatur sebagai log channel!')
                            .setFooter({ 
                                text: getFooterText(interaction),
                                iconURL: interaction.client.user.displayAvatarURL()
                            })
                    ]
                });
            } catch (error) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle('❌ Error')
                    .setDescription(error.message)
                    .setFooter({ 
                        text: getFooterText(interaction),
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
        throw new Error(`Error mengatur log channel: ${error.message}`);
    }
}

async function handleListRoles(interaction) {
    try {
        const roles = interaction.guild.roles.cache
            .sort((a, b) => b.position - a.position)
            .map(role => {
                const members = role.members.map(member => member.user.tag);
                return `${role} (${members.length} members)\n${members.map(m => `- ${m}`).join('\n') || '- Tidak ada member'}`;
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
        throw new Error(`Error mengambil daftar role: ${error.message}`);
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
                    throw new Error('Interaksi tidak dikenal.');
            }
        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Error')
                .setDescription(error.message)
                .setFooter({ 
                    text: getFooterText(interaction),
                    iconURL: interaction.client.user.displayAvatarURL()
                });

            const errorRow = new ActionRowBuilder()
                .addComponents(createBackButton(), createCloseButton());

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({
                    embeds: [errorEmbed],
                    components: [errorRow]
                });
            } else {
                await interaction.reply({
                    embeds: [errorEmbed],
                    components: [errorRow],
                    ephemeral: true
                });
            }
        }

        // Log button interaction
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
