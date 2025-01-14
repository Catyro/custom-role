const { 
    SlashCommandBuilder, 
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle
} = require('discord.js');
const EmbedService = require('../utils/embed-builder');
const RoleManager = require('../utils/role-manager');
const Logger = require('../utils/logger');
const config = require('../config');
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('edit-role')
        .setDescription('Edit your custom role')
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('The role you want to edit')
                .setRequired(true)),

    async execute(interaction) {
        try {
            const role = interaction.options.getRole('role');

            // Check if user owns the role
            const roleData = await RoleManager.getRoleData(role.id);
            if (!roleData || roleData.creatorId !== interaction.user.id) {
                return await interaction.reply({
                    content: '❌ You can only edit roles that you created!',
                    ephemeral: true
                });
            }

            // Create edit buttons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`edit_${role.id}`)
                        .setLabel('Edit Role')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`delete_${role.id}`)
                        .setLabel('Delete Role')
                        .setStyle(ButtonStyle.Danger)
                );

            await interaction.reply({
                embeds: [
                    EmbedService.createEmbed({
                        title: '🎨 Edit Custom Role',
                        description: [
                            `**Role:** ${role.name}`,
                            `**Color:** ${role.hexColor}`,
                            `**Created:** ${moment(roleData.createdAt).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')}`,
                            '\nChoose an action below:'
                        ].join('\n'),
                        color: role.color || config.EMBED_COLORS.DEFAULT
                    })
                ],
                components: [row],
                ephemeral: true
            });

            // Log command usage
            await Logger.log('COMMAND', {
                type: 'EDIT_ROLE',
                userId: interaction.user.id,
                roleId: role.id,
                guildId: interaction.guild.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

        } catch (error) {
            console.error('Error in edit-role command:', error);
            await Logger.log('ERROR', {
                type: 'COMMAND_ERROR',
                command: 'edit-role',
                error: error.message,
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

            await interaction.reply({
                content: '❌ An error occurred while editing the role.',
                ephemeral: true
            });
        }
    }
};