const { testRoleSubmit } = require('../commands/test-custom-role');
const { PermissionFlagsBits } = require('discord.js');
const EmbedBuilder = require('../utils/embed-builder');
const RoleManager = require('../utils/role-manager');
const Validator = require('../utils/validator');
const Logger = require('../utils/logger');
const moment = require('moment');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isModalSubmit()) return;

        try {
            switch(interaction.customId) {
                case 'test_role_modal':
                    await handleTestRoleModal(interaction);
                    break;

                case 'edit_role_modal':
                    await handleEditRoleModal(interaction);
                    break;

                default:
                    console.warn(`Unknown modal submission: ${interaction.customId}`);
                    await Logger.log('ERROR', {
                        guildId: interaction.guild.id,
                        type: 'UNKNOWN_MODAL',
                        modalId: interaction.customId,
                        userId: interaction.user.id,
                        timestamp: '2025-01-15 08:35:37'
                    });
            }
        } catch (error) {
            console.error('Error handling modal submit:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Terjadi kesalahan saat memproses form.',
                    ephemeral: true
                });
            }

            await Logger.log('ERROR', {
                guildId: interaction.guild.id,
                type: 'MODAL_SUBMIT_ERROR',
                error: error.message,
                modalId: interaction.customId,
                userId: interaction.user.id,
                timestamp: '2025-01-15 08:35:37'
            });
        }
    }
};

async function handleTestRoleModal(interaction) {
    // Check permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return await interaction.reply({
            content: '❌ Kamu tidak memiliki izin untuk menggunakan fitur ini.',
            ephemeral: true
        });
    }

    const userInput = interaction.fields.getTextInputValue('user_input');
    const colorInput = interaction.fields.getTextInputValue('color_input');

    // Validate user input
    const userId = Validator.validateUserInput(userInput);
    if (!userId) {
        return await interaction.reply({
            content: '❌ Format username/ID tidak valid.',
            ephemeral: true
        });
    }

    // Validate color
    const validColor = Validator.validateColor(colorInput);
    if (!validColor) {
        return await interaction.reply({
            content: '❌ Format warna tidak valid. Gunakan kode HEX (#FF0000) atau nama warna (RED).',
            ephemeral: true
        });
    }

    try {
        // Get target user
        const user = await interaction.client.users.fetch(userId);
        const member = await interaction.guild.members.fetch(user.id);

        // Check if user already has a test role
        const existingTestRole = member.roles.cache.find(role => 
            role.name.startsWith('[TEST]')
        );

        if (existingTestRole) {
            return await interaction.reply({
                content: '❌ User sudah memiliki test role. Tunggu hingga role tersebut expired.',
                ephemeral: true
            });
        }

        // Create test role
        const role = await RoleManager.createTestRole(interaction.guild, {
            userId: user.id,
            name: 'Terimakasih sudah boost Server kami',
            color: validColor
        });

        // Add role to member
        await member.roles.add(role);

        // Create success embed
        const successEmbed = new EmbedBuilder()
            .setTestRole('Role Test Diberikan',
                '[TEST] Terimakasih sudah boost Server kami')
            .addFields([
                { name: '👤 User', value: user.toString(), inline: true },
                { name: '🎨 Role', value: role.toString(), inline: true },
                { name: '⏱️ Durasi', value: '2 menit', inline: true }
            ])
            .setTimestamp();

        // Add icon upload button
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`upload_icon_${role.id}`)
                    .setLabel('Upload Icon')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`skip_icon_${role.id}`)
                    .setLabel('Lewati')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({
            embeds: [successEmbed],
            components: [row],
            ephemeral: true
        });

        // Send DM to target user
        const dmEmbed = new EmbedBuilder()
            .setTestRole('Role Test Diterima',
                `Kamu menerima role test di server ${interaction.guild.name}!\n` +
                'Role akan otomatis dihapus dalam 2 menit.')
            .addFields([
                { name: '🎨 Role', value: role.toString(), inline: true },
                { name: '⏱️ Durasi', value: '2 menit', inline: true }
            ])
            .setTimestamp();

        await user.send({ embeds: [dmEmbed] }).catch(() => {
            console.log(`Couldn't send DM to ${user.tag}`);
        });

        // Set timeout to delete role
        setTimeout(async () => {
            try {
                if (role.deleted) return;

                await member.roles.remove(role);
                await role.delete('Test role expired');

                await Logger.log('TEST_ROLE_EXPIRE', {
                    guildId: interaction.guild.id,
                    type: 'TEST_ROLE_EXPIRE',
                    userId: user.id,
                    roleId: role.id,
                    timestamp: '2025-01-15 08:40:08'
                });

                // Send expiration DM
                await user.send({
                    content: `⌛ Role test kamu di server ${interaction.guild.name} telah berakhir.`
                }).catch(() => {});

            } catch (error) {
                console.error('Error removing test role:', error);
            }
        }, 120000); // 2 minutes

    } catch (error) {
        throw error;
    }
}

async function handleEditRoleModal(interaction) {
    // Check permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return await interaction.reply({
            content: '❌ Kamu tidak memiliki izin untuk menggunakan fitur ini.',
            ephemeral: true
        });
    }

    const roleId = interaction.customId.split('_')[2];
    const role = await interaction.guild.roles.fetch(roleId);

    if (!role) {
        return await interaction.reply({
            content: '❌ Role tidak ditemukan.',
            ephemeral: true
        });
    }

    const nameInput = interaction.fields.getTextInputValue('name_input');
    const colorInput = interaction.fields.getTextInputValue('color_input');

    // Validate inputs
    const nameValidation = Validator.validateRoleName(nameInput);
    if (!nameValidation.isValid) {
        return await interaction.reply({
            content: `❌ ${nameValidation.message}`,
            ephemeral: true
        });
    }

    const validColor = Validator.validateColor(colorInput);
    if (!validColor) {
        return await interaction.reply({
            content: '❌ Format warna tidak valid. Gunakan kode HEX (#FF0000) atau nama warna (RED).',
            ephemeral: true
        });
    }

    try {
        // Update role
        const updatedRole = await RoleManager.updateRole(role, {
            name: nameInput,
            color: validColor,
            updatedBy: interaction.user.id
        });

        const successEmbed = new EmbedBuilder()
            .setSuccess('Role Diperbarui', 
                `Role berhasil diperbarui:\n${updatedRole}`)
            .addFields([
                { name: 'Nama', value: nameInput, inline: true },
                { name: 'Warna', value: validColor, inline: true }
            ])
            .setTimestamp();

        await interaction.reply({
            embeds: [successEmbed],
            ephemeral: true
        });

    } catch (error) {
        throw error;
    }
}
