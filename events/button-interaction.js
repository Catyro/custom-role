const { 
    Events, 
    ButtonBuilder, 
    ActionRowBuilder, 
    ButtonStyle,
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} = require('discord.js');
const EmbedService = require('../utils/embed-builder');
const RoleManager = require('../utils/role-manager');
const Logger = require('../utils/logger');
const Validator = require('../utils/validator');
const config = require('../config');
const moment = require('moment-timezone');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;

        try {
            const [action, roleId] = interaction.customId.split('_');

            switch(action) {
                case 'edit':
                    await handleEditRole(interaction, roleId);
                    break;
                case 'delete':
                    await handleDeleteRole(interaction, roleId);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Invalid button action!',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Button interaction error:', error);
            await Logger.log('ERROR', {
                type: 'BUTTON_INTERACTION',
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

async function handleEditRole(interaction, roleId) {
    const role = await interaction.guild.roles.fetch(roleId);
    if (!role) {
        return await interaction.reply({
            content: '❌ Role not found!',
            ephemeral: true
        });
    }

    const modal = new ModalBuilder()
        .setCustomId(`edit_role_${roleId}`)
        .setTitle('Edit Custom Role');

    const nameInput = new TextInputBuilder()
        .setCustomId('name')
        .setLabel('New Role Name')
        .setStyle(TextInputStyle.Short)
        .setMinLength(2)
        .setMaxLength(100)
        .setPlaceholder('Enter new role name...')
        .setValue(role.name)
        .setRequired(true);

    const colorInput = new TextInputBuilder()
        .setCustomId('color')
        .setLabel('New Role Color (hex)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('#FF0000')
        .setValue(role.hexColor)
        .setRequired(true);

    const iconInput = new TextInputBuilder()
        .setCustomId('icon')
        .setLabel('New Role Icon URL')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://example.com/icon.png')
        .setRequired(false);

    const firstRow = new ActionRowBuilder().addComponents(nameInput);
    const secondRow = new ActionRowBuilder().addComponents(colorInput);
    const thirdRow = new ActionRowBuilder().addComponents(iconInput);

    modal.addComponents(firstRow, secondRow, thirdRow);
    await interaction.showModal(modal);
}

async function handleDeleteRole(interaction, roleId) {
    const role = await interaction.guild.roles.fetch(roleId);
    if (!role) {
        return await interaction.reply({
            content: '❌ Role not found!',
            ephemeral: true
        });
    }

    const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`confirm_delete_${roleId}`)
            .setLabel('Confirm Delete')
            .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
            .setCustomId(`cancel_delete_${roleId}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
        embeds: [
            EmbedService.createEmbed({
                title: '⚠️ Confirm Role Deletion',
                description: `Are you sure you want to delete the role **${role.name}**?\nThis action cannot be undone!`,
                color: config.EMBED_COLORS.WARNING
            })
        ],
        components: [confirmRow],
        ephemeral: true
    });
}