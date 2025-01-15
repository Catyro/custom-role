const { 
    SlashCommandBuilder, 
    ModalBuilder, 
    ActionRowBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} = require('discord.js');
const RoleManager = require('../utils/role-manager');
const Logger = require('../utils/logger');
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('edit-role')
        .setDescription('Edit custom role kamu'),

    async execute(interaction) {
        try {
            // Get user's custom role
            const customRole = interaction.member.roles.cache.find(role => 
                role.name.startsWith('[Custom]') && 
                role.members.has(interaction.user.id)
            );

            if (!customRole) {
                await Logger.log('COMMAND_EXECUTE', {
                    guildId: interaction.guild.id,
                    type: 'EDIT_ROLE_FAILED',
                    userId: interaction.user.id,
                    reason: 'NO_CUSTOM_ROLE',
                    timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
                });

                return await interaction.reply({
                    content: '❌ Kamu tidak memiliki custom role. Custom role hanya tersedia untuk server booster.',
                    ephemeral: true
                });
            }

            // Create modal for editing
            const modal = new ModalBuilder()
                .setCustomId(`edit_role_${customRole.id}`)
                .setTitle('Edit Custom Role');

            // Create inputs
            const nameInput = new TextInputBuilder()
                .setCustomId('role_name')
                .setLabel('Nama Role')
                .setStyle(TextInputStyle.Short)
                .setMinLength(1)
                .setMaxLength(32)
                .setValue(customRole.name.replace('[Custom] ', ''))
                .setPlaceholder('Contoh: 🌟 Awesome Role')
                .setRequired(true);

            const colorInput = new TextInputBuilder()
                .setCustomId('role_color')
                .setLabel('Warna Role (HEX)')
                .setStyle(TextInputStyle.Short)
                .setValue(customRole.hexColor)
                .setPlaceholder('Contoh: #ff0000')
                .setRequired(true);

            const iconInput = new TextInputBuilder()
                .setCustomId('role_icon')
                .setLabel('Icon Role (URL)')
                .setStyle(TextInputStyle.Short)
                .setValue(customRole.iconURL() || '')
                .setPlaceholder('URL gambar untuk icon role (opsional)')
                .setRequired(false);

            // Add inputs to modal
            const firstRow = new ActionRowBuilder().addComponents(nameInput);
            const secondRow = new ActionRowBuilder().addComponents(colorInput);
            const thirdRow = new ActionRowBuilder().addComponents(iconInput);

            modal.addComponents(firstRow, secondRow, thirdRow);

            // Show modal
            await interaction.showModal(modal);

            // Log command usage
            await Logger.log('COMMAND_EXECUTE', {
                guildId: interaction.guild.id,
                type: 'EDIT_ROLE_START',
                userId: interaction.user.id,
                roleId: customRole.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

        } catch (error) {
            console.error('Error in edit-role command:', error);
            await interaction.reply({
                content: '❌ Terjadi kesalahan saat mengedit role.',
                ephemeral: true
            });

            await Logger.log('ERROR', {
                guildId: interaction.guild.id,
                type: 'EDIT_ROLE_ERROR',
                error: error.message,
                userId: interaction.user.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });
        }
    }
};
