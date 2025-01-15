const { 
    SlashCommandBuilder,
    PermissionFlagsBits
} = require('discord.js');
const RoleManager = require('../utils/role-manager');
const EmbedBuilder = require('../utils/embed-builder');
const Logger = require('../utils/logger');
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test-custom-role')
        .setDescription('Test pembuatan custom role')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Member yang akan diberi role test')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Durasi role test (dalam menit)')
                .setMinValue(1)
                .setMaxValue(60)
                .setRequired(false)
        ),

    async execute(interaction) {
        try {
            const target = interaction.options.getUser('target');
            const duration = interaction.options.getInteger('duration') || 2; // Default 2 menit
            const member = await interaction.guild.members.fetch(target.id);

            if (!member) {
                await Logger.log('COMMAND_EXECUTE', {
                    guildId: interaction.guild.id,
                    type: 'TEST_ROLE_FAILED',
                    reason: 'MEMBER_NOT_FOUND',
                    targetId: target.id,
                    userId: interaction.user.id,
                    timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
                });

                return await interaction.reply({
                    content: '❌ Member tidak ditemukan.',
                    ephemeral: true
                });
            }

            // Create test role
            const role = await RoleManager.createTestRole(interaction.guild, {
                userId: member.id,
                name: `[Test] ${member.user.username}`,
                color: '#007bff',
                duration: duration * 60000 // Convert to milliseconds
            });

            // Create DM embed
            const dmEmbed = new EmbedBuilder()
                .setCustom('🎯', 'Role Test Diberikan', 
                    `Kamu telah diberikan role test di server ${interaction.guild.name}!\n` +
                    `Role ini akan otomatis dihapus dalam ${duration} menit.`, 0x007bff)
                .addFields([
                    { name: '🎨 Role', value: role.toString(), inline: true },
                    { name: '⏱️ Durasi', value: `${duration} menit`, inline: true },
                    { name: '⌛ Berakhir Pada', value: moment().add(duration, 'minutes').tz('Asia/Jakarta').format('HH:mm:ss'), inline: true }
                ]);

            // Send DM to target
            await member.send({ embeds: [dmEmbed] }).catch(() => {
                interaction.followUp({
                    content: '⚠️ Tidak dapat mengirim DM ke member tersebut.',
                    ephemeral: true
                });
            });

            // Reply to command
            await interaction.reply({
                content: `✅ Role test telah dibuat dan diberikan ke ${member}.\nDM telah dikirim ke member tersebut.`,
                ephemeral: true
            });

            // Log command execution
            await Logger.log('COMMAND_EXECUTE', {
                guildId: interaction.guild.id,
                type: 'TEST_ROLE_CREATED',
                userId: interaction.user.id,
                targetId: member.id,
                roleId: role.id,
                duration: duration,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

        } catch (error) {
            console.error('Error in test-custom-role command:', error);
            await interaction.reply({
                content: '❌ Terjadi kesalahan saat membuat role test.',
                ephemeral: true
            });

            await Logger.log('ERROR', {
                guildId: interaction.guild.id,
                type: 'TEST_ROLE_ERROR',
                error: error.message,
                userId: interaction.user.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });
        }
    }
};
