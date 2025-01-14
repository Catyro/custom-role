const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const EmbedService = require('/home/container/utils/embed-builder');
const RoleManager = require('/home/container/utils/role-manager');
const Validator = require('/home/container/utils/validator');
const Logger = require('/home/container/utils/logger');
const moment = require('moment-timezone');

// Constants
const MAX_ICON_SIZE = 256 * 1024; // 256KB in bytes
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('edit-role')
        .setDescription('Edit custom role Anda')
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('Role yang ingin diedit')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Nama baru untuk role')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Warna baru (format: #HEXCODE)')
                .setRequired(false))
        .addAttachmentOption(option =>
            option.setName('icon')
                .setDescription('Icon baru untuk role (max 256KB, PNG/JPG)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            // Check if user is booster
            const member = interaction.member;
            if (!member.premiumSince) {
                throw new Error('Anda harus menjadi booster untuk menggunakan command ini!');
            }

            // Cooldown check
            const cooldown = RoleManager.checkCooldown(member.id, 'edit-role');
            if (cooldown > 0) {
                throw new Error(`Mohon tunggu ${cooldown} detik sebelum menggunakan command ini lagi.`);
            }

            const role = interaction.options.getRole('role');
            const userRoles = await RoleManager.getUserRoles(interaction.guildId, member.id);

            // Verify if this is user's custom role
            if (!userRoles.some(r => r.roleId === role.id)) {
                throw new Error('Anda hanya dapat mengedit custom role yang Anda miliki!');
            }

            const newName = interaction.options.getString('name');
            const newColor = interaction.options.getString('color');
            const newIcon = interaction.options.getAttachment('icon');

            // Validate name
            if (newName && (newName.length < 2 || newName.length > 100)) {
                throw new Error('Nama role harus antara 2-100 karakter!');
            }

            // Validate color
            if (newColor && !Validator.isValidHexColor(newColor)) {
                throw new Error('Format warna harus dalam bentuk HEX (contoh: #FF0000)');
            }

            // Validate icon
            if (newIcon) {
                // Check file size
                if (newIcon.size > MAX_ICON_SIZE) {
                    throw new Error(`Icon terlalu besar! Maksimal ukuran: ${MAX_ICON_SIZE / 1024}KB`);
                }

                // Check file type
                if (!ALLOWED_MIME_TYPES.includes(newIcon.contentType)) {
                    throw new Error('Icon harus berformat PNG/JPG!');
                }

                // Additional validation for image dimensions if needed
                const isValidImage = await Validator.isValidImage(newIcon);
                if (!isValidImage) {
                    throw new Error('File yang diunggah bukan gambar yang valid!');
                }
            }

            // Apply changes
            const updates = {};
            
            if (newName) {
                await role.setName(newName);
                updates.name = newName;
            }

            if (newColor) {
                await role.setColor(newColor);
                updates.color = newColor;
            }

            if (newIcon) {
                await role.setIcon(newIcon.url);
                updates.iconUrl = newIcon.url;
            }

            // Update in database
            await RoleManager.updateRole(interaction.guildId, role.id, updates);

            // Log the action
            await Logger.log('ROLE_UPDATE', {
                userId: member.id,
                roleId: role.id,
                changes: updates,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

            await interaction.editReply({
                embeds: [EmbedService.success(
                    'Role Diperbarui',
                    [
                        '✅ Custom role berhasil diperbarui!',
                        '',
                        'Perubahan yang dilakukan:',
                        newName ? `• Nama: ${newName}` : null,
                        newColor ? `• Warna: ${newColor}` : null,
                        newIcon ? `• Icon: Diperbarui` : null
                    ].filter(Boolean).join('\n')
                )]
            });

        } catch (error) {
            console.error('Error in edit-role command:', error);
            
            // Log error
            await Logger.log('ERROR', {
                command: 'edit-role',
                userId: interaction.user.id,
                error: error.message,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

            const errorEmbed = EmbedService.error(
                'Error',
                error.message || 'Terjadi kesalahan saat mengedit role. Silakan coba lagi nanti.'
            );

            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};
