const { PermissionFlagsBits } = require('discord.js');
const CustomEmbedBuilder = require('../utils/embed-builder');
const RoleManager = require('../utils/role-manager');
const Validator = require('../utils/validator');
const Logger = require('../utils/logger');
const { handleTestRoleSubmit } = require('../commands/test-custom-role');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isModalSubmit()) return;

        try {
            // Get base modal ID (without duration parameter)
            const baseModalId = interaction.customId.split('-')[0];

            switch(baseModalId) {
                case 'test_role_modal':
                    await handleTestRoleSubmit(interaction);
                    break;

                case 'edit_role_modal':
                    await handleEditRoleModal(interaction);
                    break;

                case 'set_channel_modal':
                    await handleSetChannelModal(interaction);
                    break;

                case 'edit_duration_modal':
                    await handleEditDurationModal(interaction);
                    break;

                default:
                    console.warn(`Unknown modal submission: ${interaction.customId}`);
                    await Logger.log('ERROR', {
                        guildId: interaction.guild.id,
                        type: 'UNKNOWN_MODAL',
                        modalId: interaction.customId,
                        userId: 'Catyro',
                        timestamp: '2025-01-15 10:18:33'
                    });
            }
        } catch (error) {
            console.error('Error handling modal submit:', error);
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    embeds: [
                        new CustomEmbedBuilder()
                            .setError('Error', 'Terjadi kesalahan saat memproses form.')
                    ],
                    ephemeral: true
                });
            }

            await Logger.log('ERROR', {
                guildId: interaction.guild.id,
                type: 'MODAL_SUBMIT_ERROR',
                error: error.message,
                modalId: interaction.customId,
                userId: 'Catyro',
                timestamp: '2025-01-15 10:18:33'
            });
        }
    }
};

/**
 * Handles edit role modal submission
 */
async function handleEditRoleModal(interaction) {
    try {
        const roleId = interaction.customId.split('-')[1];
        const role = await interaction.guild.roles.fetch(roleId);

        if (!role) {
            return await interaction.reply({
                embeds: [
                    new CustomEmbedBuilder()
                        .setError('Role Tidak Ditemukan', 'Role yang ingin diedit tidak ditemukan.')
                ],
                ephemeral: true
            });
        }

        // Get values from modal
        const newName = interaction.fields.getTextInputValue('role_name');
        const newColor = interaction.fields.getTextInputValue('role_color');

        // Validate name
        const nameValidation = Validator.validateRoleName(newName);
        if (!nameValidation.isValid) {
            return await interaction.reply({
                embeds: [
                    new CustomEmbedBuilder()
                        .setError('Nama Invalid', nameValidation.message)
                ],
                ephemeral: true
            });
        }

        // Validate color
        const validColor = Validator.validateColor(newColor);
        if (!validColor) {
            return await interaction.reply({
                embeds: [
                    new CustomEmbedBuilder()
                        .setError('Warna Invalid', 
                            'Format warna tidak valid. Gunakan kode HEX (#FF0000) atau nama warna (RED).')
                ],
                ephemeral: true
            });
        }

        // Update role
        await RoleManager.updateRole(role, {
            name: newName,
            color: validColor
        });

        // Send success message
        const successEmbed = new CustomEmbedBuilder()
            .setSuccess('Role Diperbarui',
                `✅ Role ${role} berhasil diperbarui!`)
            .addFields([
                { name: '📝 Nama Baru', value: newName, inline: true },
                { name: '🎨 Warna Baru', value: validColor, inline: true }
            ]);

        await interaction.reply({
            embeds: [successEmbed],
            ephemeral: true
        });

        await Logger.log('ROLE_UPDATE', {
            guildId: interaction.guild.id,
            type: 'ROLE_EDIT',
            roleId: role.id,
            newName: newName,
            newColor: validColor,
            updatedBy: 'Catyro',
            timestamp: '2025-01-15 10:18:33'
        });

    } catch (error) {
        console.error('Error in edit role modal:', error);
        throw error;
    }
}

/**
 * Handles set channel modal submission
 */
async function handleSetChannelModal(interaction) {
    try {
        const channelId = interaction.fields.getTextInputValue('channel_id')
            .replace(/[<#>]/g, '');

        const channel = await interaction.guild.channels.fetch(channelId);

        if (!channel) {
            return await interaction.reply({
                embeds: [
                    new CustomEmbedBuilder()
                        .setError('Channel Tidak Ditemukan', 
                            'Channel yang ditentukan tidak ditemukan.')
                ],
                ephemeral: true
            });
        }

        // Validate bot permissions in channel
        const permissions = Validator.validateChannelPermissions(channel, interaction.client.user);
        if (!permissions.hasPermission) {
            return await interaction.reply({
                embeds: [
                    new CustomEmbedBuilder()
                        .setError('Izin Tidak Cukup',
                            `Bot tidak memiliki izin yang cukup di ${channel}:\n` +
                            permissions.missingPermissions.map(p => `• ${p}`).join('\n'))
                ],
                ephemeral: true
            });
        }

        // Save channel settings
        await Logger.setLogChannel(interaction.guild.id, channel.id);

        const successEmbed = new CustomEmbedBuilder()
            .setSuccess('Log Channel Diatur',
                `✅ Log channel telah diatur ke ${channel}`)
            .addFields([
                { name: '📝 Channel', value: channel.toString(), inline: true },
                { name: '🆔 Channel ID', value: channel.id, inline: true }
            ]);

        await interaction.reply({
            embeds: [successEmbed],
            ephemeral: true
        });

        await Logger.log('SETTINGS_UPDATE', {
            guildId: interaction.guild.id,
            type: 'LOG_CHANNEL_SET',
            channelId: channel.id,
            updatedBy: 'Catyro',
            timestamp: '2025-01-15 10:18:33'
        });

    } catch (error) {
        console.error('Error in set channel modal:', error);
        throw error;
    }
}

/**
 * Handles edit duration modal submission
 */
async function handleEditDurationModal(interaction) {
    try {
        const defaultDuration = interaction.fields.getTextInputValue('default_duration');
        const maxDuration = interaction.fields.getTextInputValue('max_duration');

        // Validate durations
        const defaultValidation = Validator.validateDuration(defaultDuration);
        if (!defaultValidation.isValid) {
            return await interaction.reply({
                embeds: [
                    new CustomEmbedBuilder()
                        .setError('Durasi Default Invalid', defaultValidation.message)
                ],
                ephemeral: true
            });
        }

        const maxValidation = Validator.validateDuration(maxDuration);
        if (!maxValidation.isValid) {
            return await interaction.reply({
                embeds: [
                    new CustomEmbedBuilder()
                        .setError('Durasi Maksimal Invalid', maxValidation.message)
                ],
                ephemeral: true
            });
        }

        if (defaultValidation.milliseconds > maxValidation.milliseconds) {
            return await interaction.reply({
                embeds: [
                    new CustomEmbedBuilder()
                        .setError('Durasi Invalid',
                            'Durasi default tidak boleh lebih besar dari durasi maksimal.')
                ],
                ephemeral: true
            });
        }

        // Save duration settings
        const config = {
            defaultDuration: defaultValidation.milliseconds,
            maxDuration: maxValidation.milliseconds
        };

        // Update config file
        await fs.writeFile(
            path.join(__dirname, '..', 'config.json'),
            JSON.stringify(config, null, 2)
        );

        const successEmbed = new CustomEmbedBuilder()
            .setSuccess('Durasi Diperbarui',
                '✅ Pengaturan durasi berhasil diperbarui!')
            .addFields([
                { name: '⏱️ Durasi Default', value: defaultDuration, inline: true },
                { name: '⌛ Durasi Maksimal', value: maxDuration, inline: true }
            ]);

        await interaction.reply({
            embeds: [successEmbed],
            ephemeral: true
        });

        await Logger.log('SETTINGS_UPDATE', {
            guildId: interaction.guild.id,
            type: 'DURATION_SETTINGS_UPDATE',
            defaultDuration: defaultDuration,
            maxDuration: maxDuration,
            updatedBy: 'Catyro',
            timestamp: '2025-01-15 10:18:33'
        });

    } catch (error) {
        console.error('Error in edit duration modal:', error);
        throw error;
    }
}
