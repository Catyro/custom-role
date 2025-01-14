const { Events } = require('discord.js');
const EmbedService = require('../utils/embed-builder');
const RoleManager = require('../utils/role-manager');
const Logger = require('../utils/logger');

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        // Check if member started boosting
        if (!oldMember.premiumSince && newMember.premiumSince) {
            try {
                const boostCount = await RoleManager.getBoostCount(newMember.id);
                const opportunities = boostCount - RoleManager.getUserRoles(newMember.id).length;

                const embed = EmbedService.customRole(boostCount, opportunities);
                const message = await newMember.send({
                    embeds: [embed],
                    components: [createInitialButtons()]
                });

                // Store message ID for later reference
                await RoleManager.setActiveMessage(newMember.id, message.id);
                await Logger.log('BOOST_START', {
                    userId: newMember.id,
                    timestamp: new Date().toISOString()
                });

                // Schedule 24h warning
                scheduleBoostWarning(newMember);

            } catch (error) {
                console.error('Error handling boost:', error);
                await Logger.log('ERROR', {
                    type: 'BOOST_HANDLER',
                    error: error.message
                });
            }
        }
        // Check if member stopped boosting
        else if (oldMember.premiumSince && !newMember.premiumSince) {
            await handleBoostEnd(newMember);
        }
    }
};

function createInitialButtons() {
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
    
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('start_custom_role')
                .setLabel('Buat Custom Role')
                .setStyle(ButtonStyle.Primary)
        );
}

async function handleBoostEnd(member) {
    try {
        // Remove all custom roles created by this booster
        const userRoles = RoleManager.getUserRoles(member.id);
        for (const roleData of userRoles) {
            const role = member.guild.roles.cache.get(roleData.roleId);
            if (role) {
                // Get target member
                const targetMember = await member.guild.members.fetch(roleData.targetId);
                if (targetMember) {
                    await targetMember.roles.remove(role);
                }
                await role.delete('Boost ended');
            }
        }

        // Clear user's custom roles from database
        await RoleManager.clearUserRoles(member.id);

        // Remove active message if exists
        const messageId = await RoleManager.getActiveMessage(member.id);
        if (messageId) {
            try {
                const message = await member.dmChannel?.messages.fetch(messageId);
                if (message) await message.delete();
            } catch (error) {
                console.error('Error deleting message:', error);
            }
        }

        await Logger.log('BOOST_END', {
            userId: member.id,
            timestamp: new Date().toISOString()
        });

        // Notify user
        await member.send({
            embeds: [
                EmbedService.info(
                    'Boost Berakhir',
                    'Server boost Anda telah berakhir. Semua custom role yang terkait telah dihapus.'
                )
            ]
        });

    } catch (error) {
        console.error('Error handling boost end:', error);
        await Logger.log('ERROR', {
            type: 'BOOST_END_HANDLER',
            error: error.message
        });
    }
}

function scheduleBoostWarning(member) {
    // Get boost end date (30 days from now)
    const boostEndDate = new Date(member.premiumSince);
    boostEndDate.setDate(boostEndDate.getDate() + 30);
    
    // Schedule warning 24 hours before
    const warningDate = new Date(boostEndDate);
    warningDate.setDate(warningDate.getDate() - 1);

    const timeUntilWarning = warningDate.getTime() - Date.now();
    if (timeUntilWarning > 0) {
        setTimeout(async () => {
            // Check if still boosting before sending warning
            const updatedMember = await member.guild.members.fetch(member.id);
            if (updatedMember.premiumSince) {
                try {
                    await member.send({
                        embeds: [
                            EmbedService.warning(
                                'Peringatan Boost',
                                'Boost Anda akan berakhir dalam 24 jam. Pastikan untuk memperpanjang agar custom role Anda tetap aktif.'
                            )
                        ]
                    });
                } catch (error) {
                    console.error('Error sending boost warning:', error);
                }
            }
        }, timeUntilWarning);
    }
}