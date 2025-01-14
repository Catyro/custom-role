const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const EmbedService = require('../utils/embed-builder');
const RoleManager = require('../utils/role-manager');
const Validator = require('../utils/validator');

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
        // Check if user is booster
        const member = interaction.member;
        if (!member.premiumSince) {
            return interaction.reply({
                embeds: [EmbedService.error(
                    'Akses Ditolak',
                    'Anda harus menjadi booster untuk menggunakan command ini!'
                )],
                ephemeral: true
            });
        }

        // Cooldown check
        const cooldown = Validator.checkCooldown(member.id, 'edit-role');
        if (cooldown) {
            return interaction.reply({
                embeds: [EmbedService.warning(
                    'Cooldown',
                    `Mohon tunggu ${cooldown} detik sebelum menggunakan command ini lagi.`
                )],
                ephemeral: true
            });
        }

        const role = interaction.options.getRole('role');
        const userRoles = RoleManager.getUserRoles(member.id);

        // Verify if this is user's custom role
        if (!userRoles.some(r => r.roleId === role.id)) {
            return interaction.reply({
                embeds: [EmbedService.error(
                    'Akses Ditolak',
                    'Anda hanya dapat mengedit custom role yang Anda miliki!'
                )],
                ephemeral: true
            });
        }

        try {
            const newName = interaction.options.getString('name');
            const newColor = interaction.options.getString('color');
            const newIcon = interaction.options.getAttachment('icon');

            // Validate inputs
            if (newColor && !Validator.isValidHexColor(newColor)) {
                return interaction.reply({
                    embeds: [EmbedService.error(
                        'Format Salah',
                        'Format warna harus dalam bentuk HEX (contoh: #FF0000)'
                    )],
                    ephemeral: true
                });
            }

            if (newIcon && !(await Validator.isValidImage(newIcon))) {
                return interaction.reply({
                    embeds: [EmbedService.error(
                        'Format Salah',
                        'Icon harus berformat PNG/JPG dan maksimal 256KB'
                    )],
                    ephemeral: true
                });
            }

            // Apply changes
            await interaction.deferReply({ ephemeral: true });

            if (newName) await role.setName(newName);
            if (newColor) await role.setColor(newColor);
            if (newIcon) await role.setIcon(newIcon.url);

            // Update in database
            await RoleManager.updateRole(member.id, role.id, {
                name: newName || role.name,
                color: newColor || role.hexColor,
                iconUrl: newIcon ? newIcon.url : role.iconURL
            });

            return interaction.editReply({
                embeds: [EmbedService.success(
                    'Berhasil',
                    'Custom role berhasil diperbarui!'
                )]
            });

        } catch (error) {
            console.error(error);
            return interaction.reply({
                embeds: [EmbedService.error(
                    'Error',
                    'Terjadi kesalahan saat mengedit role. Silakan coba lagi nanti.'
                )],
                ephemeral: true
            });
        }
    }
};