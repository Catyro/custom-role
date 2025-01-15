const { EmbedBuilder } = require('discord.js');
const RoleManager = require('../utils/role-manager');
const Logger = require('../utils/logger');
const moment = require('moment-timezone');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isModalSubmit()) return;

        try {
            if (interaction.customId === 'test_role_modal') {
                await handleTestRoleModal(interaction);
            } else if (interaction.customId === 'edit_role_modal') {
                await handleEditRoleModal(interaction);
            }
        } catch (error) {
            console.error('Error handling modal submit:', error);
            await interaction.reply({
                content: '❌ Terjadi kesalahan saat memproses formulir.',
                ephemeral: true
            });
        }
    }
};

async function handleTestRoleModal(interaction) {
    const userId = interaction.fields.getTextInputValue('user_input') || interaction.user.id;
    const roleName = interaction.fields.getTextInputValue('role_name');
    const roleColor = interaction.fields.getTextInputValue('role_color');
    const duration = parseInt(interaction.fields.getTextInputValue('duration'));

    try {
        // Validate member
        const member = await interaction.guild.members.fetch(userId);
        if (!member) {
            return await interaction.reply({
                content: '❌ Member tidak ditemukan.',
                ephemeral: true
            });
        }

        // Create test role
        const role = await RoleManager.createTestRole(interaction.guild, {
            userId: member.id,
            name: roleName,
            color: roleColor,
            duration: duration * 60000 // Convert to milliseconds
        });

        // Create success embed
        const successEmbed = {
            title: '✅ Role Test Berhasil Dibuat',
            description: `Role test telah dibuat dan diberikan kepada ${member}.`,
            fields: [
                {
                    name: '🎨 Role',
                    value: role.toString(),
                    inline: true
                },
                {
                    name: '⏱️ Durasi',
                    value: `${duration} menit`,
                    inline: true
                },
                {
                    name: '⌛ Akan Dihapus Pada',
                    value: moment().add(duration, 'minutes').tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss'),
                    inline: true
                }
            ],
            color: parseInt(roleColor.replace('#', ''), 16),
            timestamp: new Date()
        };

        // Log the action
        await Logger.log('ROLE_TEST', {
            guildId: interaction.guild.id,
            type: 'TEST_ROLE_CREATED',
            roleId: role.id,
            userId: member.id,
            createdBy: interaction.user.id,
            duration: duration,
            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
        });

        await interaction.reply({
            embeds: [successEmbed],
            ephemeral: true
        });

    } catch (error) {
        console.error('Error creating test role:', error);
        await interaction.reply({
            content: `❌ Terjadi kesalahan: ${error.message}`,
            ephemeral: true
        });
    }
}

async function handleEditRoleModal(interaction) {
    try {
        const roleId = interaction.customId.split('_')[2];
        const role = await interaction.guild.roles.fetch(roleId);

        if (!role) {
            return await interaction.reply({
                content: '❌ Role tidak ditemukan.',
                ephemeral: true
            });
        }

        const newName = interaction.fields.getTextInputValue('role_name');
        const newColor = interaction.fields.getTextInputValue('role_color');
        const newIcon = interaction.fields.getTextInputValue('role_icon');

        // Update role
        await RoleManager.editRole(role, {
            name: newName,
            color: newColor,
            icon: newIcon || undefined
        });

        // Create success embed
        const successEmbed = {
            title: '✅ Role Berhasil Diupdate',
            description: `Role ${role} telah berhasil diupdate.`,
            fields: [
                {
                    name: 'Nama Baru',
                    value: newName,
                    inline: true
                },
                {
                    name: 'Warna Baru',
                    value: newColor,
                    inline: true
                },
                {
                    name: 'Icon Baru',
                    value: newIcon || 'Tidak diubah',
                    inline: true
                }
            ],
            color: parseInt(newColor.replace('#', ''), 16),
            timestamp: new Date()
        };

        // Log the action
        await Logger.log('ROLE_EDIT', {
            guildId: interaction.guild.id,
            type: 'ROLE_EDITED',
            roleId: role.id,
            editedBy: interaction.user.id,
            changes: {
                name: newName,
                color: newColor,
                icon: newIcon
            },
            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
        });

        await interaction.reply({
            embeds: [successEmbed],
            ephemeral: true
        });

    } catch (error) {
        console.error('Error editing role:', error);
        await interaction.reply({
            content: `❌ Terjadi kesalahan: ${error.message}`,
            ephemeral: true
        });
    }
}