const { 
    Events, 
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle 
} = require('discord.js');
const EmbedService = require('../utils/embed-builder');
const RoleManager = require('../utils/role-manager');
const Logger = require('../utils/logger');
const Validator = require('../utils/validator');

class ModalSubmitHandler {
    static async handle(interaction) {
        if (!interaction.isModalSubmit()) return;

        try {
            const handler = this.getHandler(interaction.customId);
            if (handler) {
                await handler(interaction);
            } else {
                console.warn(`Unknown modal submission: ${interaction.customId}`);
                await this.handleError(interaction, 'Modal tidak dikenal.');
            }
        } catch (error) {
            await Logger.log('ERROR', {
                type: 'MODAL_SUBMIT',
                modalId: interaction.customId,
                userId: interaction.user.id,
                error: error.message,
                stack: error.stack
            });
            await this.handleError(interaction, 'Terjadi kesalahan saat memproses modal.');
        }
    }

    static getHandler(modalId) {
        const handlers = {
            'custom_role_modal': this.handleCustomRoleModal
        };
        return handlers[modalId];
    }

    static async handleCustomRoleModal(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            // Verify user is eligible
            if (!interaction.member.premiumSince && !await RoleManager.isInTestMode(interaction.user.id)) {
                return await interaction.editReply({
                    embeds: [EmbedService.error(
                        'Akses Ditolak',
                        'Anda harus menjadi booster untuk membuat custom role!'
                    )]
                });
            }

            // Get and validate inputs
            const roleName = interaction.fields.getTextInputValue('roleName').trim();
            const roleColor = interaction.fields.getTextInputValue('roleColor').trim();
            const roleIcon = interaction.fields.getTextInputValue('roleIcon')?.trim() || null;

            // Validate name
            if (!Validator.isValidRoleName(roleName)) {
                return await interaction.editReply({
                    embeds: [EmbedService.error(
                        'Nama Tidak Valid',
                        'Nama role harus antara 1-100 karakter dan tidak mengandung karakter terlarang.'
                    )]
                });
            }

            // Validate color
            if (!Validator.isValidHexColor(roleColor)) {
                return await interaction.editReply({
                    embeds: [EmbedService.error(
                        'Warna Tidak Valid',
                        'Warna harus dalam format HEX (contoh: #FF0000)'
                    )]
                });
            }

            // Validate icon if provided
            if (roleIcon && !await Validator.isValidImageUrl(roleIcon)) {
                return await interaction.editReply({
                    embeds: [EmbedService.error(
                        'Icon Tidak Valid',
                        'URL icon tidak valid atau ukuran/format tidak sesuai.\nFormat yang didukung: PNG/JPG, Max: 256KB'
                    )]
                });
            }

            // Store role data temporarily
            const roleData = {
                name: roleName,
                color: roleColor,
                iconUrl: roleIcon,
                targetId: interaction.user.id, // Default to self
                timestamp: new Date().toISOString()
            };

            await RoleManager.setTempRoleData(interaction.user.id, roleData);

            // Create preview embed
            const previewEmbed = new EmbedBuilder()
                .setColor(roleColor)
                .setTitle('🎨 Preview Custom Role')
                .addFields(
                    { name: 'Nama', value: roleName, inline: true },
                    { name: 'Warna', value: roleColor, inline: true },
                    { name: 'Icon', value: roleIcon ? '✅ Tersedia' : '❌ Tidak ada', inline: true },
                    { name: 'Target', value: `<@${roleData.targetId}>`, inline: true }
                )
                .setFooter({ 
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                });

            if (roleIcon) {
                previewEmbed.setThumbnail(roleIcon);
            }

            // Create action buttons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('confirm_role')
                        .setLabel('Konfirmasi')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),
                    new ButtonBuilder()
                        .setCustomId('test_role')
                        .setLabel('Test (5m)')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🧪'),
                    new ButtonBuilder()
                        .setCustomId('cancel_role')
                        .setLabel('Batal')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                );

            // Log modal submission
            await Logger.log('MODAL_SUBMIT', {
                type: 'CUSTOM_ROLE_MODAL',
                userId: interaction.user.id,
                roleDetails: {
                    name: roleName,
                    hasIcon: !!roleIcon
                }
            });

            // Send preview
            await interaction.editReply({
                embeds: [previewEmbed],
                components: [row]
            });

        } catch (error) {
            await this.handleError(interaction, error);
        }
    }

    static async handleError(interaction, error) {
        const errorMessage = error instanceof Error ? error.message : error;
        
        await Logger.log('ERROR', {
            type: 'MODAL_SUBMIT',
            modalId: interaction.customId,
            userId: interaction.user.id,
            error: errorMessage
        });

        const errorEmbed = EmbedService.error(
            'Error',
            'Terjadi kesalahan saat memproses form. Silakan coba lagi nanti.'
        );

        if (interaction.deferred) {
            await interaction.editReply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        await ModalSubmitHandler.handle(interaction);
    }
};