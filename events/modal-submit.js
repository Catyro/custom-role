const { Events } = require('discord.js');
const EmbedService = require('../utils/embed-builder');
const RoleManager = require('../utils/role-manager');
const Logger = require('../utils/logger');
const Validator = require('../utils/validator');
const config = require('../config');
const moment = require('moment-timezone');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isModalSubmit()) return;

        try {
            const [action, type, roleId] = interaction.customId.split('_');

            switch(action) {
                case 'edit':
                    if (type === 'role') {
                        await handleRoleEdit(interaction, roleId);
                    }
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Invalid modal action!',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Modal submit error:', error);
            await Logger.log('ERROR', {
                type: 'MODAL_SUBMIT',
                error: error.message,
                userId: interaction.user.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

            await interaction.reply({
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            });
        }
    }
};

async function handleRoleEdit(interaction, roleId) {
    await interaction.deferReply({ ephemeral: true });

    const role = await interaction.guild.roles.fetch(roleId);
    if (!role) {
        return await interaction.editReply({
            content: '❌ Role not found!',
            ephemeral: true
        });
    }

    const newName = interaction.fields.getTextInputValue('name');
    const newColor = interaction.fields.getTextInputValue('color');
    const newIcon = interaction.fields.getTextInputValue('icon') || null;

    // Validate inputs
    if (!Validator.isValidRoleName(newName)) {
        return await interaction.editReply({
            content: '❌ Invalid role name! Name must be between 2 and 100 characters.',
            ephemeral: true
        });
    }

    if (!Validator.isValidHexColor(newColor)) {
        return await interaction.editReply({
            content: '❌ Invalid color! Please use a valid hex color code (e.g., #FF0000).',
            ephemeral: true
        });
    }

    if (newIcon && !Validator.isValidImageUrl(newIcon)) {
        return await interaction.editReply({
            content: '❌ Invalid icon URL! Please provide a valid image URL.',
            ephemeral: true
        });
    }

    try {
        // Update role
        await role.edit({
            name: newName,
            color: newColor,
            icon: newIcon ? await Validator.getImageBuffer(newIcon) : null
        });

        // Log the change
        await Logger.log('ROLE_EDIT', {
            type: 'ROLE_UPDATE',
            userId: interaction.user.id,
            roleId: role.id,
            changes: {
                name: newName,
                color: newColor,
                icon: newIcon
            },
            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
        });

        // Update role in database
        await RoleManager.updateRole(roleId, {
            name: newName,
            color: newColor,
            icon: newIcon
        });

        await interaction.editReply({
            embeds: [
                EmbedService.createEmbed({
                    title: '✅ Role Updated',
                    description: `The role has been successfully updated!\n\n**New Name:** ${newName}\n**New Color:** ${newColor}`,
                    color: config.EMBED_COLORS.SUCCESS
                })
            ],
            ephemeral: true
        });
    } catch (error) {
        console.error('Error updating role:', error);
        await interaction.editReply({
            content: '❌ Failed to update role. Please try again later.',
            ephemeral: true
        });
    }
}