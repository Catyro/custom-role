const { 
    SlashCommandBuilder,
    PermissionFlagsBits,
    ButtonBuilder,
    ActionRowBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const RoleManager = require('../utils/role-manager');
const Logger = require('../utils/logger');
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test-custom-role')
        .setDescription('Test pembuatan custom role')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            const testEmbed = {
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
                color: 0x007bff,
                timestamp: new Date()
            };

            // Create button for role creation
            const createButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('create_test_role')
                        .setLabel('🎨 Buat Role Test')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('close_test')
                        .setLabel('❌ Tutup')
                        .setStyle(ButtonStyle.Danger)
                );

            const message = await interaction.reply({
                embeds: [testEmbed],
                components: [createButton],
                ephemeral: true,
                fetchReply: true
            });

            // Create button collector
            const collector = message.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 60000
            });

            collector.on('collect', async i => {
                if (i.customId === 'create_test_role') {
                    const modal = new ModalBuilder()
                        .setCustomId('test_role_modal')
                        .setTitle('Buat Role Test');

                    const userInput = new TextInputBuilder()
                        .setCustomId('user_input')
                        .setLabel('ID Member (kosongkan untuk diri sendiri)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                        .setPlaceholder('Contoh: 123456789012345678');

                    const roleNameInput = new TextInputBuilder()
                        .setCustomId('role_name')
                        .setLabel('Nama Role')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setPlaceholder('Contoh: VIP Test');

                    const roleColorInput = new TextInputBuilder()
                        .setCustomId('role_color')
                        .setLabel('Warna Role (HEX)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setValue('#007bff')
                        .setPlaceholder('Contoh: #007bff');

                    const durationInput = new TextInputBuilder()
                        .setCustomId('duration')
                        .setLabel('Durasi (menit)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                        .setValue('5')
                        .setPlaceholder('Contoh: 5');

                    const firstRow = new ActionRowBuilder().addComponents(userInput);
                    const secondRow = new ActionRowBuilder().addComponents(roleNameInput);
                    const thirdRow = new ActionRowBuilder().addComponents(roleColorInput);
                    const fourthRow = new ActionRowBuilder().addComponents(durationInput);

                    modal.addComponents(firstRow, secondRow, thirdRow, fourthRow);
                    await i.showModal(modal);

                } else if (i.customId === 'close_test') {
                    await i.update({
                        content: '✅ Menu ditutup',
                        embeds: [],
                        components: [],
                        ephemeral: true
                    });
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time') {
                    await message.edit({
                        components: []
                    }).catch(() => {});
                }
            });

        } catch (error) {
            console.error('Error in test-custom-role command:', error);
            await interaction.reply({
                content: '❌ Terjadi kesalahan saat membuat role test.',
                ephemeral: true
            });
        }
    }
};