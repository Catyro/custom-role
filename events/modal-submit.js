const { Events } = require('discord.js');
const RoleManager = require('../utils/role-manager');
const Logger = require('../utils/logger');
const moment = require('moment-timezone');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isModalSubmit()) return;

        try {
            switch (interaction.customId) {
                case 'test_role_modal':
                    await handleTestRoleSubmit(interaction);
                    break;
                // Handle modal lainnya di sini
            }
        } catch (error) {
            console.error('Error handling modal submit:', error);
            await Logger.log('ERROR', {
                type: 'MODAL_ERROR',
                modalId: interaction.customId,
                error: error.message,
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

            await interaction.reply({
                content: '❌ Terjadi kesalahan saat memproses form.',
                ephemeral: true
            });
        }
    }
};

async function handleTestRoleSubmit(interaction) {
    const userId = interaction.fields.getTextInputValue('user_input');
    const roleName = interaction.fields.getTextInputValue('role_name');
    const roleColor = interaction.fields.getTextInputValue('role_color');
    const duration = interaction.fields.getTextInputValue('duration') || '5';

    const roleManager = new RoleManager();
    const testRole = await roleManager.createTestRole(interaction.guild, {
        userId,
        name: roleName,
        color: roleColor,
        duration: parseInt(duration) * 60 * 1000 // Convert minutes to milliseconds
    });

    // Respond to user
    await interaction.reply({
        content: `✅ Role test berhasil dibuat!\nRole akan terhapus dalam ${duration} menit.`,
        ephemeral: true
    });

    // Log creation
    await Logger.log('ROLE', {
        type: 'TEST_ROLE_CREATED',
        roleId: testRole.id,
        userId: userId,
        guildId: interaction.guild.id,
        duration: `${duration} minutes`,
        timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
    });
}