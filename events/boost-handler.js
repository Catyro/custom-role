const { Events } = require('discord.js');
const EmbedService = require('/home/container/utils/embed-builder');
const RoleManager = require('/home/container/utils/role-manager');
const Logger = require('/home/container/utils/logger');
const Config = require('../config');

class BoostHandler {
    static warningTimeouts = new Map();

    static async handleBoostStart(oldMember, newMember) {
        try {
            const boostCount = await RoleManager.getBoostCount(newMember.id);
            const userRoles = await RoleManager.getUserRoles(newMember.id);
            const opportunities = boostCount - userRoles.length;

            // Log boost event
            await Logger.log('BOOST_START', {
                userId: newMember.id,
                boostCount,
                opportunities,
                guildId: newMember.guild.id
            });

            // Send DM with custom role offer
            const embed = EmbedService.customRole(boostCount, opportunities);
            const message = await newMember.send({
                embeds: [embed],
                components: [this.createInitialButtons()]
            });

            // Store message reference
            await RoleManager.setActiveMessage(newMember.id, message.id);

            // Schedule warning
            this.scheduleBoostWarning(newMember);

            return true;
        } catch (error) {
            await Logger.log('ERROR', {
                type: 'BOOST_START_HANDLER',
                userId: newMember.id,
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    }

    static async handleBoostEnd(member) {
        try {
            // Get all user's custom roles
            const userRoles = await RoleManager.getUserRoles(member.id);
            const deletedRoles = [];
            const errors = [];

            // Process each role
            for (const roleData of userRoles) {
                try {
                    const role = member.guild.roles.cache.get(roleData.roleId);
                    if (role) {
                        // Remove role from target
                        const targetMember = await member.guild.members.fetch(roleData.targetId);
                        if (targetMember) {
                            await targetMember.roles.remove(role);
                        }
                        // Delete the role
                        await role.delete('Boost ended');
                        deletedRoles.push(roleData.roleId);
                    }
                } catch (error) {
                    errors.push({
                        roleId: roleData.roleId,
                        error: error.message
                    });
                }
            }

            // Clear user data
            await RoleManager.clearUserRoles(member.id);
            await this.clearWarningTimeout(member.id);

            // Clear active message
            const messageId = await RoleManager.getActiveMessage(member.id);
            if (messageId) {
                try {
                    const dmChannel = await member.createDM();
                    const message = await dmChannel.messages.fetch(messageId);
                    if (message) await message.delete();
                } catch (error) {
                    console.error('Error deleting message:', error);
                }
            }

            // Log the event
            await Logger.log('BOOST_END', {
                userId: member.id,
                guildId: member.guild.id,
                deletedRoles,
                errors: errors.length > 0 ? errors : undefined
            });

            // Notify user
            const embed = EmbedService.info(
                'Boost Berakhir',
                'Server boost Anda telah berakhir. Semua custom role yang terkait telah dihapus.'
            );

            if (errors.length > 0) {
                embed.addField('⚠️ Peringatan', 
                    'Beberapa role mungkin perlu dihapus secara manual. Silakan hubungi admin.');
            }

            await member.send({ embeds: [embed] });

            return true;
        } catch (error) {
            await Logger.log('ERROR', {
                type: 'BOOST_END_HANDLER',
                userId: member.id,
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    }

    static scheduleBoostWarning(member) {
        // Clear existing warning if any
        this.clearWarningTimeout(member.id);

        // Calculate warning time (24h before boost ends)
        const boostEndDate = new Date(member.premiumSince);
        boostEndDate.setDate(boostEndDate.getDate() + 30);
        const warningDate = new Date(boostEndDate);
        warningDate.setDate(warningDate.getDate() - 1);

        const now = Date.now();
        const warningTime = warningDate.getTime() - now;

        if (warningTime > 0) {
            const timeoutId = setTimeout(async () => {
                try {
                    const embed = EmbedService.warning(
                        '⚠️ Peringatan Boost',
                        'Server boost Anda akan berakhir dalam 24 jam. ' +
                        'Semua custom role akan dihapus saat boost berakhir.'
                    );

                    await member.send({ embeds: [embed] });
                    
                    await Logger.log('BOOST_WARNING', {
                        userId: member.id,
                        boostEndDate: boostEndDate.toISOString()
                    });
                } catch (error) {
                    await Logger.log('ERROR', {
                        type: 'BOOST_WARNING',
                        userId: member.id,
                        error: error.message
                    });
                }
            }, warningTime);

            this.warningTimeouts.set(member.id, timeoutId);
        }
    }

    static clearWarningTimeout(userId) {
        const timeoutId = this.warningTimeouts.get(userId);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.warningTimeouts.delete(userId);
        }
    }

    static createInitialButtons() {
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        
        return new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('start_custom_role')
                    .setLabel('Buat Custom Role')
                    .setStyle(ButtonStyle.Primary)
            );
    }
}

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        if (!oldMember.premiumSince && newMember.premiumSince) {
            await BoostHandler.handleBoostStart(oldMember, newMember);
        } 
        else if (oldMember.premiumSince && !newMember.premiumSince) {
            await BoostHandler.handleBoostEnd(newMember);
        }
    }
};
