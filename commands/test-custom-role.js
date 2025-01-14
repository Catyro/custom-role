const { 
    SlashCommandBuilder,
    PermissionFlagsBits 
} = require('discord.js');
const EmbedService = require('../utils/embed-builder');
const RoleManager = require('../utils/role-manager');
const Logger = require('../utils/logger');
const config = require('../config');
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test-custom-role')
        .setDescription('Test a custom role before creating')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('The name for the test role')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('The color for the test role (hex code)')
                .setRequired(true)),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const name = interaction.options.getString('name');
            const color = interaction.options.getString('color');

            // Validate inputs
            if (!RoleManager.isValidRoleName(name)) {
                return await interaction.editReply({
                    content: '❌ Invalid role name! Name must be between 2 and 100 characters.',
                    ephemeral: true
                });
            }

            if (!RoleManager.isValidHexColor(color)) {
                return await interaction.editReply({
                    content: '❌ Invalid color! Please use a valid hex color code (e.g., #FF0000).',
                    ephemeral: true
                });
            }

            // Create temporary test role
            const testRole = await interaction.guild.roles.create({
                name: `[TEST] ${name}`,
                color: color,
                reason: `Test role requested by ${interaction.user.tag}`
            });

            // Add role to user temporarily
            await interaction.member.roles.add(testRole);

            // Send confirmation
            await interaction.editReply({
                embeds: [
                    EmbedService.createEmbed({
                        title: '🎨 Test Role Created',
                        description: [
                            'Your test role has been created and applied!',
                            'It will be automatically removed in 5 minutes.',
                            '',
                            '**Role Details:**',
                            `Name: ${testRole.name}`,
                            `Color: ${testRole.hexColor}`
                        ].join('\n'),
                        color: testRole.color
                    })
                ],
                ephemeral: true
            });

            // Log test role creation
            await Logger.log('ROLE', {
                type: 'TEST_ROLE_CREATE',
                userId: interaction.user.id,
                roleId: testRole.id,
                guildId: interaction.guild.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

            // Remove role after 5 minutes
            setTimeout(async () => {
                try {
                    await interaction.member.roles.remove(testRole);
                    await testRole.delete('Test role duration expired');
                    
                    await interaction.followUp({
                        content: '🗑️ Test role has been removed.',
                        ephemeral: true
                    });
                } catch (error) {
                    console.error('Error removing test role:', error);
                }
            }, 5 * 60 * 1000);

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

            await interaction.editReply({
                content: '❌ An error occurred while creating the test role.',
                ephemeral: true
            });
        }
    }
};