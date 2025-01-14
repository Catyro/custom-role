const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const Logger = require('../utils/logger');
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Configure bot settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        // Dapatkan waktu dalam format "Today at HH:mm"
        const timeString = moment()
            .tz('Asia/Jakarta')
            .format('HH:mm');

        // Create main settings embed
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
            .setTimestamp()
            .setFooter({ 
                text: `Today at ${timeString}`,
                iconURL: interaction.client.user.displayAvatarURL()
            });

        // Create buttons
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
                new ButtonBuilder()
                    .setCustomId('close_menu')
                    .setLabel('Close')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );

        // Send initial message
        await interaction.reply({
            embeds: [embed],
            components: [row],
            ephemeral: true
        });

        // Log command usage
        try {
            await Logger.log('COMMAND_EXECUTE', {
                command: 'settings',
                userId: interaction.user.id,
                user: interaction.user.tag,
                guild: interaction.guild.name,
                channel: interaction.channel.name,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });
        } catch (error) {
            console.error('Error logging command execution:', error);
        }
    },
};
