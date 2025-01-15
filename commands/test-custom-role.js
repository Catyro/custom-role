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
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User yang akan diberikan test role')
                .setRequired(false)),

    async execute(interaction) {
        try {
            // Check permissions
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
                return await interaction.reply({
                    content: '❌ Kamu tidak memiliki izin untuk menggunakan command ini.',
                    ephemeral: true
                });
            }

            // Get target user if provided in command
            const targetUser = interaction.options.getUser('user');
            await showTestRoleForm(interaction, targetUser);

            await Logger.log('COMMAND_EXECUTE', {
                guildId: interaction.guild.id,
                type: 'TEST_ROLE_START',
                userId: interaction.user.id,
                targetId: targetUser?.id || null,
                timestamp: '2025-01-15 09:09:46'
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
                timestamp: '2025-01-15 09:09:46'
            });
        }
    }
};

async function showTestRoleForm(interaction, targetUser = null) {
    const modal = new ModalBuilder()
        .setCustomId('test_role_modal')
        .setTitle('[TEST] Custom Role Creator');

    // User Input Field
    const userInput = new TextInputBuilder()
        .setCustomId('user_input')
        .setLabel('Username/ID')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('@username, username, <@ID>, atau ID')
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
        const existingTestRole = member.roles.cache.find(role => 
            role.name.startsWith('[TEST]')
        );
        
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

        // Add role to member
        await member.roles.add(role);

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
            timestamp: '2025-01-15 09:09:46'
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
                    timestamp: '2025-01-15 09:09:46'
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
            timestamp: '2025-01-15 09:09:46'
        });
    }
}

// Helper Functions
async function validateAndGetUser(interaction, input) {
    // Remove mention formatting
    let userId = input.replace(/[<@!>]/g, '');
    
    try {
        // Try to fetch user by ID first
        return await interaction.client.users.fetch(userId);
    } catch {
        try {
            // If ID fails, try to find by username
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

// Additional helper functions
async function handleIconUpload(interaction, roleId) {
    const role = await interaction.guild.roles.fetch(roleId);
    if (!role) {
        return await interaction.reply({
            content: '❌ Role tidak ditemukan.',
            ephemeral: true
        });
    }

    const uploadEmbed = new EmbedBuilder()
        .setCustom('🖼️', 'Upload Icon', 
            'Kirim URL gambar untuk icon role.\n' +
            'Format yang didukung: PNG, JPG, GIF\n' +
            'Ukuran maksimal: 256KB', 0x7289da);

    await interaction.update({
        embeds: [uploadEmbed],
        components: []
    });

    // Create message collector
    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ 
        filter, 
        max: 1,
        time: 60000 
    });

    collector.on('collect', async message => {
        const url = message.content;
        message.delete().catch(() => {});

        try {
            await role.setIcon(url);

            const successEmbed = new EmbedBuilder()
                .setSuccess('Icon Diperbarui',
                    `Icon untuk role ${role} berhasil diperbarui!`);

            await interaction.editReply({
                embeds: [successEmbed],
                components: []
            });

            await Logger.log('ROLE_UPDATE', {
                guildId: interaction.guild.id,
                type: 'TEST_ROLE_ICON_UPDATE',
                roleId: role.id,
                updatedBy: interaction.user.id,
                timestamp: '2025-01-15 09:11:57'
            });

        } catch (error) {
            const errorEmbed = new EmbedBuilder()
                .setError('Error',
                    'Gagal mengupload icon. Pastikan URL valid dan format yang didukung.');

            await interaction.editReply({
                embeds: [errorEmbed],
                components: []
            });

            await Logger.log('ERROR', {
                guildId: interaction.guild.id,
                type: 'TEST_ROLE_ICON_ERROR',
                roleId: role.id,
                error: error.message,
                timestamp: '2025-01-15 09:11:57'
            });
        }
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            const timeoutEmbed = new EmbedBuilder()
                .setError('Timeout',
                    'Waktu upload icon telah habis.');

            interaction.editReply({
                embeds: [timeoutEmbed],
                components: []
            });
        }
    });
}

async function handleSkipIcon(interaction, roleId) {
    const role = await interaction.guild.roles.fetch(roleId);
    if (!role) {
        return await interaction.reply({
            content: '❌ Role tidak ditemukan.',
            ephemeral: true
        });
    }

    const successEmbed = new EmbedBuilder()
        .setSuccess('Setup Selesai',
            'Setup test role telah selesai!\n' +
            'Role akan otomatis dihapus dalam 2 menit.');

    await interaction.update({
        embeds: [successEmbed],
        components: []
    });

    await Logger.log('TEST_ROLE_SKIP_ICON', {
        guildId: interaction.guild.id,
        type: 'TEST_ROLE_SKIP_ICON',
        roleId: role.id,
        userId: interaction.user.id,
        timestamp: '2025-01-15 09:11:57'
    });
}

module.exports.handleTestRoleSubmit = handleTestRoleSubmit;
module.exports.handleIconUpload = handleIconUpload;
module.exports.handleSkipIcon = handleSkipIcon;
