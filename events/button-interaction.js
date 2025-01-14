const { Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const RoleManager = require('/home/container/utils/role-manager');
const Logger = require('/home/container/utils/logger');
const EmbedService = require('/home/container/utils/embed-builder');
const Config = require('/home/container/config');
const Validator = require('/home/container/utils/validator');

class ButtonInteractionHandler {
    static async handle(interaction) {
        if (!interaction.isButton()) return;

        try {
            const handler = this.getHandler(interaction.customId);
            if (handler) {
                await handler(interaction);
            } else {
                console.warn(`Unknown button interaction: ${interaction.customId}`);
                await this.handleError(interaction, 'Interaksi tidak dikenal.');
            }
        } catch (error) {
            await Logger.log('ERROR', {
                type: 'BUTTON_INTERACTION',
                buttonId: interaction.customId,
                userId: interaction.user.id,
                error: error.message,
                stack: error.stack
            });
            await this.handleError(interaction, 'Terjadi kesalahan saat memproses permintaan.');
        }
    }

    static getHandler(customId) {
        const handlers = {
            'start_custom_role': this.handleStartCustomRole,
            'view_logs': this.handleViewLogs,
            'refresh_logs': this.handleViewLogs,
            'set_log_channel': this.handleSetLogChannel,
            'list_roles': this.handleListRoles,
            'settings_back': this.handleBack,
            'close_menu': this.handleCloseMenu,
            'confirm_role': this.handleConfirmRole,
            'cancel_role': this.handleCancelRole,
            'test_role': this.handleTestRole
        };
        return handlers[customId];
    }

    static async handleStartCustomRole(interaction) {
        try {
            // Verify user is boosting
            if (!interaction.member.premiumSince && !await RoleManager.isInTestMode(interaction.user.id)) {
                return interaction.reply({
                    embeds: [EmbedService.error(
                        'Akses Ditolak',
                        'Anda harus menjadi booster untuk membuat custom role!'
                    )],
                    ephemeral: true
                });
            }

            // Check role limits
            const userRoles = await RoleManager.getUserRoles(interaction.user.id);
            const boostCount = await RoleManager.getBoostCount(interaction.user.id);
            if (userRoles.length >= boostCount) {
                return interaction.reply({
                    embeds: [EmbedService.error(
                        'Batas Tercapai',
                        'Anda telah mencapai batas maksimum pembuatan custom role!'
                    )],
                    ephemeral: true
                });
            }

            // Create and show modal
            const modal = new ModalBuilder()
                .setCustomId('custom_role_modal')
                .setTitle('Buat Custom Role');

            const nameInput = new TextInputBuilder()
                .setCustomId('roleName')
                .setLabel('Nama Role')
                .setPlaceholder('Masukkan nama untuk role baru')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100);

            const colorInput = new TextInputBuilder()
                .setCustomId('roleColor')
                .setLabel('Warna Role (HEX)')
                .setPlaceholder('#FF0000')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const iconInput = new TextInputBuilder()
                .setCustomId('roleIcon')
                .setLabel('URL Icon Role (Opsional)')
                .setPlaceholder('https://example.com/icon.png')
                .setStyle(TextInputStyle.Short)
                .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nameInput),
                new ActionRowBuilder().addComponents(colorInput),
                new ActionRowBuilder().addComponents(iconInput)
            );

            await interaction.showModal(modal);
            await Logger.log('MODAL_SHOW', {
                type: 'CUSTOM_ROLE_CREATE',
                userId: interaction.user.id
            });

        } catch (error) {
            await this.handleError(interaction, error);
        }
    }

    static async handleViewLogs(interaction) {
        try {
            await interaction.deferUpdate();

            const logs = await Logger.getLogs(50); // Get last 50 logs
            const stats = await Logger.getLogStats();

            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('📋 System Logs')
                .setDescription(logs)
                .addFields(
                    { name: 'Total Logs', value: stats.total.toString(), inline: true },
                    { name: 'Today\'s Logs', value: stats.today.toString(), inline: true },
                    { name: 'Error Count', value: stats.errors.toString(), inline: true }
                )
                .setTimestamp()
                .setFooter({ 
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('refresh_logs')
                        .setLabel('Refresh')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🔄'),
                    new ButtonBuilder()
                        .setCustomId('settings_back')
                        .setLabel('Back')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('close_menu')
                        .setLabel('Close')
                        .setStyle(ButtonStyle.Danger)
                );

            await interaction.editReply({ embeds: [embed], components: [row] });
        } catch (error) {
            await this.handleError(interaction, error);
        }
    }

    static async handleSetLogChannel(interaction) {
        try {
            // Verify admin permissions
            if (!interaction.member.permissions.has('ADMINISTRATOR')) {
                return interaction.reply({
                    embeds: [EmbedService.error(
                        'Akses Ditolak',
                        'Hanya admin yang dapat mengatur log channel!'
                    )],
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('📌 Set Log Channel')
                .setDescription('Mention channel yang ingin dijadikan log channel.')
                .setFooter({ 
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                });

            await interaction.reply({ embeds: [embed], ephemeral: true });

            const filter = m => m.author.id === interaction.user.id && m.mentions.channels.size > 0;
            const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

            collector.on('collect', async message => {
                const channel = message.mentions.channels.first();
                
                try {
                    await Logger.setLogChannel(channel);
                    
                    const successEmbed = new EmbedBuilder()
                        .setColor(0x2ecc71)
                        .setTitle('✅ Success')
                        .setDescription(`Log channel telah diatur ke ${channel}`);
                    
                    await interaction.editReply({ embeds: [successEmbed] });
                    await message.delete().catch(() => {});
                } catch (error) {
                    await this.handleError(interaction, `Gagal mengatur log channel: ${error.message}`);
                }
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor(0xe74c3c)
                        .setTitle('⏰ Timeout')
                        .setDescription('Waktu pengaturan log channel telah habis.');
                    
                    interaction.editReply({ embeds: [timeoutEmbed] });
                }
            });
        } catch (error) {
            await this.handleError(interaction, error);
        }
    }

    static async handleListRoles(interaction) {
        try {
            const roles = await RoleManager.getAllCustomRoles(interaction.guild.id);
            const formattedRoles = roles.map(role => {
                const discordRole = interaction.guild.roles.cache.get(role.roleId);
                return discordRole ? 
                    `${discordRole} - Created by <@${role.creatorId}> for <@${role.targetId}>` :
                    `[Deleted Role] - Originally created by <@${role.creatorId}>`;
            });

            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('🎨 Custom Roles')
                .setDescription(formattedRoles.join('\n') || 'No custom roles found.')
                .setTimestamp()
                .setFooter({ 
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                });

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('settings_back')
                        .setLabel('Back')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('close_menu')
                        .setLabel('Close')
                        .setStyle(ButtonStyle.Danger)
                );

            await interaction.update({ embeds: [embed], components: [row] });
        } catch (error) {
            await this.handleError(interaction, error);
        }
    }

    static async handleBack(interaction) {
        try {
            const embed = EmbedService.settings();
            const row = this.createSettingsButtons();
            await interaction.update({ embeds: [embed], components: [row] });
        } catch (error) {
            await this.handleError(interaction, error);
        }
    }

    static async handleCloseMenu(interaction) {
        try {
            await interaction.update({ 
                content: 'Menu closed.', 
                embeds: [], 
                components: [],
                ephemeral: true 
            });
        } catch (error) {
            await this.handleError(interaction, error);
        }
    }

    static async handleError(interaction, error) {
        const errorMessage = error instanceof Error ? error.message : error;
        
        await Logger.log('ERROR', {
            type: 'BUTTON_INTERACTION',
            buttonId: interaction.customId,
            userId: interaction.user.id,
            error: errorMessage
        });

        const errorEmbed = EmbedService.error(
            'Error',
            'Terjadi kesalahan saat memproses permintaan. Silakan coba lagi nanti.'
        );

        if (interaction.deferred) {
            await interaction.editReply({ embeds: [errorEmbed] });
        } else {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }

    static createSettingsButtons() {
        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('view_logs')
                    .setLabel('View Logs')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('set_log_channel')
                    .setLabel('Set Log Channel')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📌'),
                new ButtonBuilder()
                    .setCustomId('list_roles')
                    .setLabel('List Roles')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🎨'),
                new ButtonBuilder()
                    .setCustomId('close_menu')
                    .setLabel('Close')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            );
    }

    static async handleConfirmRole(interaction) {
        try {
            const roleData = await RoleManager.getTempRoleData(interaction.user.id);
            if (!roleData) {
                return await interaction.reply({
                    embeds: [EmbedService.error(
                        'Error',
                        'Data role tidak ditemukan. Silakan buat role baru.'
                    )],
                    ephemeral: true
                });
            }

            await interaction.deferUpdate();

            // Create the role
            const role = await interaction.guild.roles.create({
                name: roleData.name,
                color: roleData.color,
                reason: `Custom role created by ${interaction.user.tag}`
            });

            if (roleData.iconUrl) {
                await role.setIcon(roleData.iconUrl).catch(console.error);
            }

            // Assign role to target
            const targetMember = await interaction.guild.members.fetch(roleData.targetId);
            await targetMember.roles.add(role);

            // Save role data
            await RoleManager.createCustomRole(
                interaction.guild.id,
                interaction.user.id,
                roleData.targetId,
                {
                    ...roleData,
                    roleId: role.id
                }
            );

            // Clear temporary data
            await RoleManager.clearTempRoleData(interaction.user.id);

            // Log success
            await Logger.log('CUSTOM_ROLE_CREATE', {
                userId: interaction.user.id,
                targetId: roleData.targetId,
                roleId: role.id,
                guildId: interaction.guild.id,
                roleDetails: {
                    name: roleData.name,
                    color: roleData.color,
                    hasIcon: !!roleData.iconUrl
                }
            });

            // Send success message
            const successEmbed = EmbedService.success(
                'Custom Role Created',
                `Role ${role} telah dibuat dan diberikan kepada <@${roleData.targetId}>`
            );

            await interaction.editReply({
                embeds: [successEmbed],
                components: []
            });

        } catch (error) {
            await this.handleError(interaction, error);
        }
    }

    static async handleCancelRole(interaction) {
        try {
            await RoleManager.clearTempRoleData(interaction.user.id);
            
            const embed = EmbedService.info(
                'Dibatalkan',
                'Pembuatan custom role dibatalkan.'
            );

            await interaction.update({
                embeds: [embed],
                components: []
            });

        } catch (error) {
            await this.handleError(interaction, error);
        }
    }

    static async handleTestRole(interaction) {
        try {
            const roleData = await RoleManager.getTempRoleData(interaction.user.id);
            if (!roleData) {
                return await interaction.reply({
                    embeds: [EmbedService.error(
                        'Error',
                        'Data role tidak ditemukan.'
                    )],
                    ephemeral: true
                });
            }

            await interaction.deferUpdate();

            // Create temporary test role
            const testRole = await interaction.guild.roles.create({
                name: `[TEST] ${roleData.name}`,
                color: roleData.color,
                reason: `Test role by ${interaction.user.tag}`
            });

            if (roleData.iconUrl) {
                await testRole.setIcon(roleData.iconUrl).catch(console.error);
            }

            // Assign test role
            const targetMember = await interaction.guild.members.fetch(roleData.targetId);
            await targetMember.roles.add(testRole);

            // Log test start
            await Logger.log('ROLE_TEST', {
                userId: interaction.user.id,
                targetId: roleData.targetId,
                roleId: testRole.id
            });

            // Send test message
            const testEmbed = EmbedService.info(
                'Test Mode',
                `Role test ${testRole} telah dibuat dan diberikan kepada <@${roleData.targetId}>\n` +
                'Role akan dihapus dalam 5 menit.'
            );

            await interaction.editReply({
                embeds: [testEmbed],
                components: []
            });

            // Schedule cleanup
            setTimeout(async () => {
                try {
                    if (testRole.deleted) return;

                    // Remove role from target
                    const member = await interaction.guild.members.fetch(roleData.targetId);
                    if (member) await member.roles.remove(testRole);

                    // Delete test role
                    await testRole.delete('Test duration ended');

                    // Log test end
                    await Logger.log('ROLE_TEST_END', {
                        userId: interaction.user.id,
                        roleId: testRole.id
                    });

                    // Notify user
                    const endEmbed = EmbedService.info(
                        'Test Selesai',
                        'Role test telah dihapus.'
                    );

                    await interaction.user.send({ embeds: [endEmbed] }).catch(console.error);

                } catch (error) {
                    console.error('Error in test role cleanup:', error);
                }
            }, 5 * 60 * 1000); // 5 minutes

        } catch (error) {
            await this.handleError(interaction, error);
        }
    }
}

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        await ButtonInteractionHandler.handle(interaction);
    }
};
