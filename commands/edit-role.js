const { 
    SlashCommandBuilder, 
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType
} = require('discord.js');
const CustomEmbedBuilder = require('../utils/embed-builder');
const RoleManager = require('../utils/role-manager');
const Logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('edit-role')
        .setDescription('Edit custom role milikmu'),

    async execute(interaction) {
        try {
            // Check if user can use this command
            const canUseCommand = await checkUserAccess(interaction.member);
            if (!canUseCommand.allowed) {
                return await interaction.reply({
                    embeds: [
                        new CustomEmbedBuilder()
                            .setError('Akses Ditolak', canUseCommand.message)
                    ],
                    ephemeral: true
                });
            }

            // Get user's custom roles
            const userRoles = await getUserCustomRoles(interaction.member);
            if (userRoles.length === 0) {
                return await interaction.reply({
                    embeds: [
                        new CustomEmbedBuilder()
                            .setError('Tidak Ada Role',
                                'Kamu tidak memiliki custom role yang dapat diedit.')
                    ],
                    ephemeral: true
                });
            }

            // Create role selection menu
            const selectMenu = createRoleSelectMenu(userRoles);

            await interaction.reply({
                embeds: [
                    new CustomEmbedBuilder()
                        .setInfo('Pilih Role',
                            'Silakan pilih role yang ingin kamu edit:')
                ],
                components: [selectMenu],
                ephemeral: true
            });

            // Create collector for role selection
            const filter = i => i.user.id === interaction.user.id;
            const collector = interaction.channel.createMessageComponentCollector({
                filter,
                time: 30000,
                max: 1
            });

            collector.on('collect', async i => {
                const selectedRole = await interaction.guild.roles.fetch(i.values[0]);
                if (!selectedRole) {
                    return await i.update({
                        embeds: [
                            new CustomEmbedBuilder()
                                .setError('Role Tidak Ditemukan',
                                    'Role yang dipilih tidak ditemukan.')
                        ],
                        components: []
                    });
                }

                // Send DM with edit options
                try {
                    const dm = await interaction.user.createDM();
                    await sendEditInterface(dm, selectedRole, interaction.guild);

                    await i.update({
                        embeds: [
                            new CustomEmbedBuilder()
                                .setSuccess('DM Terkirim',
                                    'Silakan cek DM untuk mengedit role.')
                        ],
                        components: []
                    });

                    await Logger.log('ROLE_EDIT', {
                        guildId: interaction.guild.id,
                        type: 'ROLE_EDIT_START',
                        roleId: selectedRole.id,
                        userId: 'Catyro',
                        timestamp: '2025-01-15 17:59:08'
                    });

                } catch (error) {
                    await i.update({
                        embeds: [
                            new CustomEmbedBuilder()
                                .setError('DM Gagal',
                                    'Tidak dapat mengirim DM. Pastikan DM kamu terbuka.')
                        ],
                        components: []
                    });
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    interaction.editReply({
                        embeds: [
                            new CustomEmbedBuilder()
                                .setWarning('Waktu Habis',
                                    'Waktu pemilihan role telah habis.')
                        ],
                        components: []
                    });
                }
            });

        } catch (error) {
            console.error('Error in edit-role command:', error);
            
            await interaction.reply({
                embeds: [
                    new CustomEmbedBuilder()
                        .setError('Error',
                            'Terjadi kesalahan saat mengedit role.')
                ],
                ephemeral: true
            });

            await Logger.log('ERROR', {
                guildId: interaction.guild.id,
                type: 'EDIT_ROLE_ERROR',
                error: error.message,
                userId: 'Catyro',
                timestamp: '2025-01-15 17:59:08'
            });
        }
    }
};

/**
 * Check if user can use the edit-role command
 */
async function checkUserAccess(member) {
    // Check if user is a booster
    if (member.premiumSince) {
        return { allowed: true };
    }

    // Check if user has any custom roles
    const customRoles = await getUserCustomRoles(member);
    if (customRoles.length > 0) {
        return { allowed: true };
    }

    return {
        allowed: false,
        message: 'Kamu harus menjadi server booster atau memiliki custom role untuk menggunakan command ini.'
    };
}

/**
 * Get user's custom roles
 */
async function getUserCustomRoles(member) {
    return member.roles.cache
        .filter(role => 
            role.name.startsWith('[BOOST]') || 
            RoleManager.isCustomRole(role.id)
        )
        .map(role => ({
            id: role.id,
            name: role.name,
            color: role.hexColor,
            icon: role.icon || null
        }));
}

/**
 * Create role selection menu
 */
function createRoleSelectMenu(roles) {
    return new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('role_select')
                .setPlaceholder('Pilih role yang ingin diedit')
                .addOptions(
                    roles.map(role => ({
                        label: role.name,
                        value: role.id,
                        description: `Role Color: ${role.color}`,
                        emoji: '🎨'
                    }))
                )
        );
}

/**
 * Send edit interface via DM
 */
async function sendEditInterface(dmChannel, role, guild) {
    const embed = new CustomEmbedBuilder()
        .setEdit('✏️ Edit Role',
            `Editing role: ${role.name}`)
        .addFields([
            { name: '🎨 Current Color', value: role.hexColor, inline: true },
            { name: '🖼️ Has Icon', value: role.icon ? 'Yes' : 'No', inline: true },
            { name: '🏠 Server', value: guild.name, inline: true }
        ]);

    const buttons = [
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`edit_name_${role.id}`)
                    .setLabel('📝 Edit Nama')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`edit_color_${role.id}`)
                    .setLabel('🎨 Edit Warna')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId(`edit_icon_${role.id}`)
                    .setLabel('🖼️ Edit Icon')
                    .setStyle(ButtonStyle.Primary)
            ),
        new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`edit_preview_${role.id}`)
                    .setLabel('👀 Preview')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`edit_close_${role.id}`)
                    .setLabel('❌ Tutup')
                    .setStyle(ButtonStyle.Danger)
            )
    ];

    const message = await dmChannel.send({
        embeds: [embed],
        components: buttons
    });

    // Create collector for buttons
    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000 // 5 minutes
    });

    collector.on('collect', async i => {
        const [action, type, roleId] = i.customId.split('_');
        
        // Handle different button actions
        switch(type) {
            case 'name':
                await handleNameEdit(i, role);
                break;
            case 'color':
                await handleColorEdit(i, role);
                break;
            case 'icon':
                await handleIconEdit(i, role);
                break;
            case 'preview':
                await handlePreview(i, role);
                break;
            case 'close':
                await i.update({
                    embeds: [
                        new CustomEmbedBuilder()
                            .setSuccess('Edit Selesai',
                                'Menu edit role telah ditutup.')
                    ],
                    components: []
                });
                collector.stop();
                break;
        }
    });

    collector.on('end', () => {
        message.edit({
            components: buttons.map(row => {
                row.components.forEach(button => button.setDisabled(true));
                return row;
            })
        }).catch(console.error);
    });
}

// Handlers for edit actions will be implemented in button-interaction.js
