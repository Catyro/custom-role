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
const EmbedBuilder = require('../utils/embed-builder');
const RoleManager = require('../utils/role-manager');
const Logger = require('../utils/logger');
const moment = require('moment');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test-custom-role')
        .setDescription('Coba custom role selama 2 menit')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        try {
            await showTestRoleForm(interaction);

            await Logger.log('COMMAND_EXECUTE', {
                guildId: interaction.guild.id,
                type: 'TEST_ROLE_START',
                userId: interaction.user.id,
                timestamp: '2025-01-15 07:57:25'
            });
        } catch (error) {
            console.error('Error in test-custom-role command:', error);
            await interaction.reply({
                content: '❌ Terjadi kesalahan saat membuat test role.',
                ephemeral: true
            });

            await Logger.log('ERROR', {
                guildId: interaction.guild.id,
                type: 'TEST_ROLE_ERROR',
                error: error.message,
                userId: interaction.user.id,
                timestamp: '2025-01-15 07:57:25'
            });
        }
    }
};

async function showTestRoleForm(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('test_role_modal')
        .setTitle('[TEST] Custom Role Creator');

    // User Input Field
    const userInput = new TextInputBuilder()
        .setCustomId('user_input')
        .setLabel('Username/ID')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('@username, ID, atau mention')
        .setMinLength(2)
        .setMaxLength(100)
        .setRequired(true);

    // Color Input Field
    const colorInput = new TextInputBuilder()
        .setCustomId('color_input')
        .setLabel('Warna Role')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('#HEX atau nama warna (contoh: #FF0000 atau RED)')
        .setMinLength(3)
        .setMaxLength(7)
        .setRequired(true);

    const firstRow = new ActionRowBuilder().addComponents(userInput);
    const secondRow = new ActionRowBuilder().addComponents(colorInput);

    modal.addComponents(firstRow, secondRow);
    await interaction.showModal(modal);
}

// Modal Submit Handler
async function handleTestRoleSubmit(interaction) {
    const userInput = interaction.fields.getTextInputValue('user_input');
    const colorInput = interaction.fields.getTextInputValue('color_input');

    try {
        // Validate and get user
        const user = await validateAndGetUser(interaction, userInput);
        if (!user) return;

        // Validate color
        const validColor = validateColor(colorInput);
        if (!validColor) {
            return await interaction.reply({
                content: '❌ Format warna tidak valid. Gunakan kode HEX (#FF0000) atau nama warna (RED).',
                ephemeral: true
            });
        }

        // Check if user already has a test role
        const member = await interaction.guild.members.fetch(user.id);
        const existingTestRole = member.roles.cache.find(role => role.name.startsWith('[Test]'));
        
        if (existingTestRole) {
            return await interaction.reply({
                content: '❌ User sudah memiliki test role. Tunggu hingga role tersebut expired.',
                ephemeral: true
            });
        }

        // Create test role
        const role = await RoleManager.createTestRole(interaction.guild, {
            userId: user.id,
            name: '[TEST] Terimakasih sudah boost Server kami',
            color: validColor
        });

        // Create success embed
        const successEmbed = new EmbedBuilder()
            .setCustom('🎯', 'Role Test Diberikan', 
                `Role test telah diberikan ke ${user}\n` +
                `Role akan otomatis dihapus dalam 2 menit.`, 0x7289da)
            .addFields([
                { name: '👤 User', value: user.toString(), inline: true },
                { name: '🎨 Role', value: role.toString(), inline: true },
                { name: '⏱️ Durasi', value: '2 menit', inline: true }
            ]);

        // Add icon upload button
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`upload_icon_${role.id}`)
                    .setLabel('Upload Icon')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`skip_icon_${role.id}`)
                    .setLabel('Lewati')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({
            embeds: [successEmbed],
            components: [buttons],
            ephemeral: true
        });

        // Send DM to target user
        const dmEmbed = new EmbedBuilder()
            .setCustom('🎯', 'Role Test Diterima', 
                `Kamu menerima role test di server ${interaction.guild.name}!\n` +
                `Role akan otomatis dihapus dalam 2 menit.`, 0x7289da)
            .addFields([
                { name: '🎨 Role', value: role.toString(), inline: true },
                { name: '⏱️ Durasi', value: '2 menit', inline: true }
            ]);

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
            timestamp: '2025-01-15 07:57:25'
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
                    timestamp: '2025-01-15 07:57:25'
                });

                // Send expiration DM
                await user.send({
                    content: `⌛ Role test kamu di server ${interaction.guild.name} telah berakhir.`
                }).catch(() => {});

            } catch (error) {
                console.error('Error removing test role:', error);
            }
        }, 120000); // 2 minutes

    } catch (error) {
        console.error('Error in test role modal submit:', error);
        await interaction.reply({
            content: '❌ Terjadi kesalahan saat membuat test role.',
            ephemeral: true
        });

        await Logger.log('ERROR', {
            guildId: interaction.guild.id,
            type: 'TEST_ROLE_MODAL_ERROR',
            error: error.message,
            timestamp: '2025-01-15 07:57:25'
        });
    }
}

// Helper Functions
async function validateAndGetUser(interaction, input) {
    let userId = input.replace(/[<@!>]/g, '');
    
    try {
        return await interaction.client.users.fetch(userId);
    } catch {
        try {
            const member = await interaction.guild.members.cache.find(
                m => m.user.username.toLowerCase() === input.toLowerCase() ||
                     m.displayName.toLowerCase() === input.toLowerCase()
            );
            if (member) return member.user;
        } catch (error) {
            console.error('Error finding user:', error);
        }

        await interaction.reply({
            content: '❌ User tidak ditemukan. Pastikan username atau ID valid.',
            ephemeral: true
        });
        return null;
    }
}

function validateColor(color) {
    // Check for hex code
    if (color.startsWith('#')) {
        return /^#[0-9A-F]{6}$/i.test(color) ? color : null;
    }

    // Check for basic colors
    const basicColors = {
        'RED': '#FF0000',
        'GREEN': '#00FF00',
        'BLUE': '#0000FF',
        'YELLOW': '#FFFF00',
        'PURPLE': '#800080',
        'ORANGE': '#FFA500',
        'BLACK': '#000000',
        'WHITE': '#FFFFFF',
        'PINK': '#FFC0CB'
    };

    const upperColor = color.toUpperCase();
    return basicColors[upperColor] || null;
}

module.exports.handleTestRoleSubmit = handleTestRoleSubmit;
