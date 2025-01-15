const { 
    SlashCommandBuilder, 
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits 
} = require('discord.js');
const RoleManager = require('../utils/role-manager');
const Logger = require('../utils/logger');
const config = require('../config');
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test-custom-role')
        .setDescription('Test pembuatan custom role')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const testEmbed = EmbedService.createEmbed({
                title: '🎯 Test Custom Role',
                description: 'Fitur ini memungkinkan Anda untuk menguji sistem custom role.\nKlik tombol di bawah untuk membuat role test.',
                fields: [
                    {
                        name: '⚠️ Perhatian',
                        value: 'Role test akan otomatis terhapus setelah durasi yang ditentukan.',
                        inline: false
                    },
                    {
                        name: '📝 Informasi',
                        value: 'Anda dapat memberikan role test ke member lain atau diri sendiri.',
                        inline: false
                    }
                ],
                color: config.EMBED_COLORS.PRIMARY
            });

            // Create button for role creation
            const createButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('create_test_role')
                        .setLabel('🎨 Buat Role Test')
                        .setStyle(ButtonStyle.Primary)
                );

            await interaction.reply({
                embeds: [testEmbed],
                components: [createButton],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error in test-custom-role command:', error);
            await Logger.log('ERROR', {
                type: 'COMMAND_ERROR',
                command: 'test-custom-role',
                error: error.message,
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

            await interaction.reply({
                content: '❌ Terjadi kesalahan saat membuat role test.',
                ephemeral: true
            });
        }
    }
};