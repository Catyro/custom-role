const { Events } = require('discord.js');
const schedule = require('node-schedule');
const moment = require('moment-timezone');
const EmbedService = require('../utils/embed-builder');
const RoleManager = require('../utils/role-manager');
const Logger = require('../utils/logger');

// Simpan job schedules
const warningJobs = new Map();

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        // Check if member started boosting
        if (!oldMember.premiumSince && newMember.premiumSince) {
            try {
                const boostCount = await RoleManager.getBoostCount(newMember.id);
                const userRoles = await RoleManager.getUserRoles(newMember.guild.id, newMember.id);
                const opportunities = boostCount - userRoles.length;

                // DM user with initial message
                try {
                    const embed = EmbedService.customRole(boostCount, opportunities);
                    const message = await newMember.send({
                        embeds: [embed],
                        components: [createInitialButtons()]
                    });

                    // Store message ID for later reference
                    await RoleManager.setActiveMessage(newMember.id, message.id);
                } catch (dmError) {
                    console.error('Error sending DM:', dmError);
                    // Log DM failure but continue execution
                    await Logger.log('WARNING', {
                        type: 'DM_FAILED',
                        userId: newMember.id,
                        reason: 'Cannot send DM to user',
                        timestamp: moment().tz('Asia/Jakarta').format()
                    });
                }

                // Log boost start
                await Logger.log('BOOST_START', {
                    userId: newMember.id,
                    guildId: newMember.guild.id,
                    timestamp: moment().tz('Asia/Jakarta').format()
                });

                // Schedule 24h warning
                scheduleBoostWarning(newMember);

            } catch (error) {
                console.error('Error handling boost:', error);
                await Logger.log('ERROR', {
                    type: 'BOOST_HANDLER',
                    userId: newMember.id,
                    error: error.message,
                    timestamp: moment().tz('Asia/Jakarta').format()
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
                .setEmoji('✨')
        );
}

async function handleBoostEnd(member) {
    try {
        // Cancel any scheduled warnings
        const jobKey = `warning_${member.id}`;
        if (warningJobs.has(jobKey)) {
            warningJobs.get(jobKey).cancel();
            warningJobs.delete(jobKey);
        }

        // Get all custom roles before clearing
        const userRoles = await RoleManager.getUserRoles(member.guild.id, member.id);
        
        // Remove all custom roles created by this booster
        for (const roleData of userRoles) {
            try {
                const role = await member.guild.roles.fetch(roleData.roleId);
                if (role) {
                    // Get target member
                    const targetMember = await member.guild.members.fetch(roleData.targetId).catch(() => null);
                    if (targetMember) {
                        await targetMember.roles.remove(role).catch(console.error);
                    }
                    await role.delete('Boost ended').catch(console.error);
                }
            } catch (roleError) {
                console.error(`Error handling role ${roleData.roleId}:`, roleError);
            }
        }

        // Clear user's custom roles from database
        await RoleManager.clearUserRoles(member.guild.id, member.id);

        // Remove active message if exists
        try {
            const messageId = await RoleManager.getActiveMessage(member.id);
            if (messageId) {
                const dmChannel = await member.createDM().catch(() => null);
                if (dmChannel) {
                    const message = await dmChannel.messages.fetch(messageId).catch(() => null);
                    if (message) await message.delete().catch(console.error);
                }
            }
        } catch (messageError) {
            console.error('Error handling active message:', messageError);
        }

        // Log boost end
        await Logger.log('BOOST_END', {
            userId: member.id,
            guildId: member.guild.id,
            timestamp: moment().tz('Asia/Jakarta').format()
        });

        // Notify user about boost end
        try {
            await member.send({
                embeds: [
                    EmbedService.info(
                        'Boost Berakhir',
                        [
                            '🔔 Server boost Anda telah berakhir.',
                            '',
                            '• Semua custom role yang terkait telah dihapus',
                            '• Untuk membuat custom role baru, Anda perlu boost server lagi',
                            '',
                            'Terima kasih telah mendukung server kami! 🙏'
                        ].join('\n')
                    )
                ]
            });
        } catch (notifyError) {
            console.error('Error sending boost end notification:', notifyError);
        }

    } catch (error) {
        console.error('Error handling boost end:', error);
        await Logger.log('ERROR', {
            type: 'BOOST_END_HANDLER',
            userId: member.id,
            error: error.message,
            timestamp: moment().tz('Asia/Jakarta').format()
        });
    }
}

function scheduleBoostWarning(member) {
    try {
        // Cancel existing warning if any
        const jobKey = `warning_${member.id}`;
        if (warningJobs.has(jobKey)) {
            warningJobs.get(jobKey).cancel();
        }

        // Calculate warning time (24 hours before boost ends)
        const boostEndDate = moment(member.premiumSince).add(30, 'days');
        const warningDate = boostEndDate.clone().subtract(24, 'hours');

        // Only schedule if warning time is in the future
        if (warningDate.isAfter(moment())) {
            const job = schedule.scheduleJob(warningDate.toDate(), async () => {
                try {
                    // Verify member is still boosting
                    const updatedMember = await member.guild.members.fetch(member.id);
                    if (updatedMember.premiumSince) {
                        await member.send({
                            embeds: [
                                EmbedService.warning(
                                    '⚠️ Peringatan Boost',
                                    [
                                        'Boost Anda akan berakhir dalam 24 jam.',
                                        '',
                                        '• Custom role Anda akan dihapus jika boost berakhir',
                                        '• Perpanjang boost untuk mempertahankan custom role',
                                        '',
                                        `Waktu berakhir: ${boostEndDate.tz('Asia/Jakarta').format('DD MMM YYYY HH:mm')} WIB`
                                    ].join('\n')
                                )
                            ]
                        });

                        await Logger.log('BOOST_WARNING', {
                            userId: member.id,
                            guildId: member.guild.id,
                            expiryTime: boostEndDate.format(),
                            timestamp: moment().tz('Asia/Jakarta').format()
                        });
                    }
                } catch (error) {
                    console.error('Error in warning job:', error);
                    await Logger.log('ERROR', {
                        type: 'BOOST_WARNING',
                        userId: member.id,
                        error: error.message,
                        timestamp: moment().tz('Asia/Jakarta').format()
                    });
                } finally {
                    // Clean up job
                    warningJobs.delete(jobKey);
                }
            });

            // Store job reference
            warningJobs.set(jobKey, job);
        }
    } catch (error) {
        console.error('Error scheduling boost warning:', error);
        Logger.log('ERROR', {
            type: 'BOOST_WARNING_SCHEDULE',
            userId: member.id,
            error: error.message,
            timestamp: moment().tz('Asia/Jakarta').format()
        });
    }
}
