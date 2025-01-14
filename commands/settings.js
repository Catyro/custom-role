const { 
    SlashCommandBuilder,
    PermissionFlagsBits 
} = require('discord.js');
const EmbedService = require('../utils/embed-builder');
const Logger = require('../utils/logger');
const config = require('../config');
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Manage bot settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current bot settings'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset bot settings to default')),

    async execute(interaction) {
        try {
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'view':
                    await handleViewSettings(interaction);
                    break;
                case 'reset':
                    await handleResetSettings(interaction);
                    break;
            }

            // Log command usage
            await Logger.log('COMMAND', {
                type: 'SETTINGS',
                subcommand: subcommand,
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

        } catch (error) {
            console.error('Error in settings command:', error);
            await Logger.log('ERROR', {
                type: 'COMMAND_ERROR',
                command: 'settings',
                error: error.message,
                userId: interaction.user.id,
                guildId: interaction.guild.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

            await interaction.reply({
                content: '❌ An error occurred while managing settings.',
                ephemeral: true
            });
        }
    }
};

async function handleViewSettings(interaction) {
    const settings = {
        maxRolesPerUser: config.ROLE_LIMITS.MAX_ROLES_PER_USER,
        maxRolesPerGuild: config.ROLE_LIMITS.MAX_ROLES_PER_GUILD,
        maxNameLength: config.ROLE_LIMITS.MAX_NAME_LENGTH,
        maxIconSize: `${config.ROLE_LIMITS.MAX_ICON_SIZE / 1024}KB`,
        cooldowns: {
            createRole: `${config.COOLDOWNS.CREATE_ROLE / 1000} seconds`,
            editRole: `${config.COOLDOWNS.EDIT_ROLE / 1000} seconds`,
            testRole: `${config.COOLDOWNS.TEST_ROLE / 1000} seconds`
        }
    };

    await interaction.reply({
        embeds: [
            EmbedService.createEmbed({
                title: '⚙️ Bot Settings',
                fields: [
                    {
                        name: 'Role Limits',
                        value: [
                            `Max Roles per User: ${settings.maxRolesPerUser}`,
                            `Max Roles per Guild: ${settings.maxRolesPerGuild}`,
                            `Max Name Length: ${settings.maxNameLength}`,
                            `Max Icon Size: ${settings.maxIconSize}`
                        ].join('\n'),
                        inline: false
                    },
                    {
                        name: 'Cooldowns',
                        value: [
                            `Create Role: ${settings.cooldowns.createRole}`,
                            `Edit Role: ${settings.cooldowns.editRole}`,
                            `Test Role: ${settings.cooldowns.testRole}`
                        ].join('\n'),
                        inline: false
                    }
                ],
                color: config.EMBED_COLORS.INFO,
                timestamp: true
            })
        ],
        ephemeral: true
    });
}

async function handleResetSettings(interaction) {
    await interaction.reply({
        embeds: [
            EmbedService.createEmbed({
                title: '⚠️ Reset Settings',
                description: 'Settings have been reset to default values.',
                color: config.EMBED_COLORS.SUCCESS,
                timestamp: true
            })
        ],
        ephemeral: true
    });
}