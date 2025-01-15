const RoleManager = require('../utils/role-manager');
const EmbedBuilder = require('../utils/embed-builder');
const Logger = require('../utils/logger');
const moment = require('moment-timezone');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isModalSubmit()) return;

        try {
            if (interaction.customId.startsWith('edit_role_')) {
                await handleRoleEdit(interaction);
            }
        } catch (error) {
            console.error('Error handling modal submit:', error);
            await interaction.reply({
                content: '❌ Terjadi kesalahan saat memproses form.',
                ephemeral: true
            });

            await Logger.log('ERROR', {
                guildId: interaction.guild.id,
                type: 'MODAL_SUBMIT_ERROR',
                error: error.message,
                userId: interaction.user.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });
        }
    }
};

async function handleRoleEdit(interaction) {
    try {
        const roleId = interaction.customId.replace('edit_role_', '');
        const role = interaction.guild.roles.cache.get(roleId);

        if (!role) {
            return await interaction.reply({
                content: '❌ Role tidak ditemukan.',
                ephemeral: true
            });
        }

        // Get values from modal
        const newName = interaction.fields.getTextInputValue('role_name');
        const newColor = interaction.fields.getTextInputValue('role_color');
        const newIcon = interaction.fields.getTextInputValue('role_icon');

        // Update role
        await RoleManager.editRole(role, {
            name: `[Custom] ${newName}`,
            color: newColor,
            icon: newIcon || null
        });

        // Create success embed
        const successEmbed = new EmbedBuilder()
            .setSuccess('Role Diperbarui', 'Role kamu telah berhasil diperbarui!')
            .addFields([
                { name: '📝 Nama Baru', value: `[Custom] ${newName}`, inline: true },
                { name: '🎨 Warna Baru', value: newColor, inline: true },
                { name: '🖼️ Icon Baru', value: newIcon || 'Tidak ada', inline: true }
            ]);

        await interaction.reply({
            embeds: [successEmbed],
            ephemeral: true
        });

        // Log role edit
        await Logger.log('ROLE_EDITED', {
            guildId: interaction.guild.id,
            type: 'ROLE_UPDATE',
            userId: interaction.user.id,
            roleId: role.id,
            updates: {
                name: newName,
                color: newColor,
                icon: newIcon
            },
            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
        });

    } catch (error) {
        throw error;
    }
}
