const { 
    SlashCommandBuilder, 
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const CustomEmbedBuilder = require('../utils/embed-builder');
const RoleManager = require('../utils/role-manager');
const Validator = require('../utils/validator');
const Logger = require('../utils/logger');
const TimeFormatter = require('../utils/time-formatter');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test-custom-role')
        .setDescription('Coba custom role dengan durasi kustom')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User yang akan diberikan test role')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('durasi')
                .setDescription('Durasi test role (default: 1m)')
                .setRequired(false)),

    async execute(interaction) {
        try {
            // Check permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                return await interaction.reply({
                    embeds: [
                        new CustomEmbedBuilder()
                            .setError('Akses Ditolak', 
                                'Kamu tidak memiliki izin untuk menggunakan command ini.')
                    ],
                    ephemeral: true
                });
            }

            // Get options
            const targetUser = interaction.options.getUser('user');
            const durationInput = interaction.options.getString('durasi');

            // Validate duration if provided
            let duration = 60000; // Default: 1 minute
            if (durationInput) {
                const durationValidation = Validator.validateDuration(durationInput);
                if (!durationValidation.isValid) {
                    return await interaction.reply({
                        embeds: [
                            new CustomEmbedBuilder()
                                .setError('Durasi Invalid', durationValidation.message)
                        ],
                        ephemeral: true
                    });
                }
                duration = durationValidation.milliseconds;
            }

            await showTestRoleForm(interaction, targetUser, duration);

            await Logger.log('COMMAND_EXECUTE', {
                guildId: interaction.guild.id,
                type: 'TEST_ROLE_START',
                userId: interaction.user.id,
                targetId: targetUser?.id || null,
                duration: TimeFormatter.formatDuration(duration),
                timestamp: '2025-01-15 10:08:53'
            });

        } catch (error) {
            console.error('Error in test-custom-role command:', error);
            await interaction.reply({
                embeds: [
                    new CustomEmbedBuilder()
                        .setError('Error', 'Terjadi kesalahan saat membuat test role.')
                ],
                ephemeral: true
            });

            await Logger.log('ERROR', {
                guildId: interaction.guild.id,
                type: 'TEST_ROLE_ERROR',
                error: error.message,
                userId: interaction.user.id,
                timestamp: '2025-01-15 10:08:53'
            });
        }
    }
};

async function showTestRoleForm(interaction, targetUser = null, duration = 60000) {
    const modal = new ModalBuilder()
        .setCustomId(`test_role_modal-${duration}`)
        .setTitle('[TEST] Custom Role Creator');

    // User Input Field
    const userInput = new TextInputBuilder()
        .setCustomId('user_input')
        .setLabel('Username/ID (@user, user, atau ID)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: @username, username, atau ID')
        .setMinLength(2)
        .setMaxLength(100)
        .setRequired(true);

    // Pre-fill user input if target was provided
    if (targetUser) {
        userInput.setValue(targetUser.id);
    }

    // Color Input Field
    const colorInput = new TextInputBuilder()
        .setCustomId('color_input')
        .setLabel('Warna Role (#HEX atau nama warna)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: #FF0000 atau RED')
        .setMinLength(3)
        .setMaxLength(7)
        .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(userInput);
    const secondRow = new ActionRowBuilder().addComponents(colorInput);

    modal.addComponents(firstRow, secondRow);
    await interaction.showModal(modal);
}

// Modal Submit Handler - Test Role
async function handleTestRoleSubmit(interaction) {
    // Extract duration from modal ID
    const duration = parseInt(interaction.customId.split('-')[1]) || 60000;
    const userInput = interaction.fields.getTextInputValue('user_input');
    const colorInput = interaction.fields.getTextInputValue('color_input');

    try {
        // Validate and get user
        const user = await validateAndGetUser(interaction, userInput);
        if (!user) return;

        // Validate color
        const validColor = Validator.validateColor(colorInput);
        if (!validColor) {
            return await interaction.reply({
                embeds: [
                    new CustomEmbedBuilder()
                        .setError('Warna Invalid', 
                            'Format warna tidak valid. Gunakan kode HEX (#FF0000) atau nama warna (RED).')
                ],
                ephemeral: true
            });
        }

        // Check if user already has a test role
        const member = await interaction.guild.members.fetch(user.id);
        const existingTestRole = member.roles.cache.find(role => 
            role.name.startsWith('[TEST]')
        );
        
        if (existingTestRole) {
            return await interaction.reply({
                embeds: [
                    new CustomEmbedBuilder()
                        .setError('Role Sudah Ada', 
                            'User sudah memiliki test role. Tunggu hingga role tersebut expired.')
                ],
                ephemeral: true
            });
        }

        // Create test role
        const role = await RoleManager.createTestRole(interaction.guild, {
            userId: user.id,
            name: '[TEST] Custom Role',
            color: validColor
        });

        // Add role to member
        await member.roles.add(role);

        const endTime = new Date(Date.now() + duration);

        // Create success embed
        const successEmbed = new CustomEmbedBuilder()
            .setTestRole('Role Test Diberikan', 
                `Role test telah diberikan ke ${user}\n` +
                `Role akan otomatis dihapus dalam ${TimeFormatter.formatDuration(duration)}.`)
            .addFields([
                { name: '👤 User', value: user.toString(), inline: true },
                { name: '🎨 Role', value: role.toString(), inline: true }
            ])
            .addDurationField(duration)
            .addRemainingTimeField(endTime);

        // Add icon upload button
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`upload_icon_${role.id}`)
                    .setLabel('🖼️ Upload Icon')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`skip_icon_${role.id}`)
                    .setLabel('⏩ Lewati')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({
            embeds: [successEmbed],
            components: [buttons],
            ephemeral: true
        });

        // Send DM to target user
        const dmEmbed = new CustomEmbedBuilder()
            .setTestRole('[TEST] Terimakasih sudah boost Server kami', 
                `Kamu menerima role test di server ${interaction.guild.name}!\n` +
                `Role akan otomatis dihapus dalam ${TimeFormatter.formatDuration(duration)}.`)
            .addFields([
                { name: '🎨 Role', value: role.toString(), inline: true }
            ])
            .addDurationField(duration)
            .addRemainingTimeField(endTime);

        await user.send({ embeds: [dmEmbed] }).catch(() => {
            console.log(`Couldn't send DM to ${user.tag}`);
        });

        // Log test role creation
        await Logger.log('TEST_ROLE_CREATED', {
            guildId: interaction.guild.id,
            type: 'TEST_ROLE_CREATE',
            targetId: user.id,
            roleId: role.id,
            color: validColor,
            duration: TimeFormatter.formatDuration(duration),
            timestamp: '2025-01-15 10:08:53'
        });

        // Set timeout to delete role
        setTimeout(async () => {
            try {
                if (role.deleted) return;
                
                await member.roles.remove(role);
                await role.delete('Test role expired');

                await Logger.log('TEST_ROLE_EXPIRED', {
                    guildId: interaction.guild.id,
                    type: 'TEST_ROLE_EXPIRE',
                    userId: user.id,
                    roleId: role.id,
                    timestamp: '2025-01-15 10:08:53'
                });

                // Send expiration DM
                const expireEmbed = new CustomEmbedBuilder()
                    .setInfo('Role Test Berakhir', 
                        `Role test kamu di server ${interaction.guild.name} telah berakhir.`);

                await user.send({ embeds: [expireEmbed] }).catch(() => {});

            } catch (error) {
                console.error('Error removing test role:', error);
            }
        }, duration);

    } catch (error) {
        console.error('Error in test role modal submit:', error);
        await interaction.reply({
            embeds: [
                new CustomEmbedBuilder()
                    .setError('Error', 'Terjadi kesalahan saat membuat test role.')
            ],
            ephemeral: true
        });

        await Logger.log('ERROR', {
            guildId: interaction.guild.id,
            type: 'TEST_ROLE_MODAL_ERROR',
            error: error.message,
            timestamp: '2025-01-15 10:08:53'
        });
    }
}

// Helper Functions
async function validateAndGetUser(interaction, input) {
    const userId = await Validator.validateUserInput(interaction.client, input);
    if (!userId) {
        await interaction.reply({
            embeds: [
                new CustomEmbedBuilder()
                    .setError('User Invalid', 
                        'Format username/ID tidak valid.')
            ],
            ephemeral: true
        });
        return null;
    }

    try {
        return await interaction.client.users.fetch(userId);
    } catch (error) {
        await interaction.reply({
            embeds: [
                new CustomEmbedBuilder()
                    .setError('User Tidak Ditemukan', 
                        'User tidak ditemukan. Pastikan username atau ID valid.')
            ],
            ephemeral: true
        });
        return null;
    }
}

module.exports.handleTestRoleSubmit = handleTestRoleSubmit;
