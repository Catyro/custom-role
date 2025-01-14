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
    // ... (fungsi yang sudah ada sebelumnya)
}

async function handleSetLogChannel(interaction) {
    // ... (fungsi yang sudah ada sebelumnya)
}

async function handleListRoles(interaction, page = 0) {
    // ... (fungsi yang sudah ada sebelumnya)
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
