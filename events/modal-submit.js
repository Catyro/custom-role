const { Events, EmbedBuilder } = require('discord.js');
const EmbedService = require('../utils/embed-builder');
const RoleManager = require('../utils/role-manager');
const Validator = require('../utils/validator');
const Logger = require('../utils/logger');
const moment = require('moment-timezone');

// Fungsi untuk format footer yang konsisten
function getFooterText(interaction) {
    const jakarta = moment().tz('Asia/Jakarta');
    const date = jakarta.format('DD-MM-YYYY');
    const time = jakarta.format('h:mm A');
    return `${date} | Today at ${time} | ${interaction.user.tag}`;
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isModalSubmit()) return;

        if (interaction.customId === 'custom_role_modal') {
            await handleCustomRoleModalSubmit(interaction);
        }
    }
};

async function handleCustomRoleModalSubmit(interaction) {
    try {
        // Ambil nilai dari form
        const roleName = interaction.fields.getTextInputValue('role_name');
        const roleColor = interaction.fields.getTextInputValue('role_color');
        const roleIcon = interaction.fields.getTextInputValue('role_icon') || null;
        const targetUser = interaction.fields.getTextInputValue('target_user');

        await interaction.deferReply({ ephemeral: true });

        // Validasi input
        if (!Validator.isValidHexColor(roleColor)) {
            return await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xe74c3c)
                        .setTitle('❌ Format Warna Salah')
                        .setDescription('Format warna harus dalam bentuk HEX (contoh: #FF0000)')
                        .setFooter({ 
                            text: getFooterText(interaction),
                            iconURL: interaction.client.user.displayAvatarURL()
                        })
                ]
            });
        }

        // Parse target user ID
        const targetId = targetUser.replace(/[<@!>]/g, '');
        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);

        if (!targetMember) {
            return await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xe74c3c)
                        .setTitle('❌ User Tidak Ditemukan')
                        .setDescription('User yang dituju tidak ditemukan dalam server.')
                        .setFooter({ 
                            text: getFooterText(interaction),
                            iconURL: interaction.client.user.displayAvatarURL()
                        })
                ]
            });
        }

        // Create role
        const role = await interaction.guild.roles.create({
            name: roleName,
            color: roleColor,
            reason: `Custom role created by ${interaction.user.tag}`
        });

        // Set role icon jika ada
        if (roleIcon && Validator.isValidUrl(roleIcon)) {
            try {
                await role.setIcon(roleIcon);
            } catch (error) {
                console.error('Error setting role icon:', error);
                // Tidak perlu return karena ini optional
            }
        }

        // Assign role ke target user
        await targetMember.roles.add(role);

        // Simpan role ke database
        await RoleManager.addRole(interaction.user.id, {
            roleId: role.id,
            targetId: targetMember.id,
            name: roleName,
            color: roleColor,
            iconUrl: roleIcon
        });

        // Log aksi
        await Logger.log('CUSTOM_ROLE_CREATE', {
            userId: interaction.user.id,
            targetId: targetMember.id,
            roleId: role.id,
            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
        });

        // Kirim konfirmasi
        await interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0x2ecc71)
                    .setTitle('✅ Custom Role Berhasil Dibuat')
                    .setDescription([
                        `Role: ${role}`,
                        `Target: ${targetMember}`,
                        `Warna: ${roleColor}`,
                        roleIcon ? `Icon: [Link](${roleIcon})` : ''
                    ].filter(Boolean).join('\n'))
                    .setFooter({ 
                        text: getFooterText(interaction),
                        iconURL: interaction.client.user.displayAvatarURL()
                    })
            ]
        });

        // Kirim notifikasi ke target user
        try {
            await targetMember.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor(roleColor)
                        .setTitle('🎉 Anda Mendapat Custom Role!')
                        .setDescription([
                            `${interaction.user} telah memberikan Anda custom role:`,
                            `Role: ${role}`,
                            `Warna: ${roleColor}`
                        ].join('\n'))
                        .setFooter({ 
                            text: getFooterText(interaction),
                            iconURL: interaction.client.user.displayAvatarURL()
                        })
                ]
            });
        } catch (error) {
            console.error('Error sending DM to target user:', error);
        }

    } catch (error) {
        console.error('Error in handleCustomRoleModalSubmit:', error);
        
        // Log error
        await Logger.log('ERROR', {
            type: 'MODAL_SUBMIT',
            userId: interaction.user.id,
            error: error.message,
            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
        });

        // Kirim pesan error
        const errorMessage = {
            embeds: [
                new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle('❌ Error')
                    .setDescription('Terjadi kesalahan saat membuat custom role. Silakan coba lagi nanti.')
                    .setFooter({ 
                        text: getFooterText(interaction),
                        iconURL: interaction.client.user.displayAvatarURL()
                    })
            ]
        };

        if (interaction.deferred) {
            await interaction.editReply(errorMessage);
        } else {
            await interaction.reply({ ...errorMessage, ephemeral: true });
        }
    }
}
