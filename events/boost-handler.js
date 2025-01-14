const { Events } = require('discord.js');
const schedule = require('node-schedule');
const moment = require('moment-timezone');
const EmbedService = require('../utils/embed-builder');
const RoleManager = require('../utils/role-manager');
const Logger = require('../utils/logger');

// Tracking untuk scheduled jobs
const scheduledJobs = new Map();

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        // Check if member started boosting
        if (!oldMember.premiumSince && newMember.premiumSince) {
            await handleBoostStart(newMember);
        }
        // Check if member stopped boosting
        else if (oldMember.premiumSince && !newMember.premiumSince) {
            await handleBoostEnd(newMember);
        }
    }
};

async function handleBoostStart(member) {
    try {
        const boostCount = await RoleManager.getBoostCount(member.id);
        const opportunities = boostCount - RoleManager.getUserRoles(member.id).length;

        // Cancel any existing warning jobs for this user
        cancelExistingWarningJob(member.id);

        // Schedule new warning
        await scheduleBoostWarning(member);

        // Try to send DM
        try {
            const embed = EmbedService.customRole(boostCount, opportunities);
            const message = await member.send({
                embeds: [embed],
                components: [createInitialButtons()]
            });

            // Store message ID for later reference
            await RoleManager.setActiveMessage(member.id, message.id);
        } catch (dmError) {
            // Log DM failure but don't throw error
            console.warn(`Unable to send DM to ${member.user.tag}:`, dmError);
            await Logger.log('WARNING', {
                type: 'DM_FAILED',
                userId: member.id,
                reason: 'Unable to send boost start message',
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });
        }

        // Log boost start regardless of DM success
        await Logger.log('BOOST_START', {
            userId: member.id,
            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
        });

    } catch (error) {
        console.error('Error handling boost:', error);
        await Logger.log('ERROR', {
            type: 'BOOST_HANDLER',
            error: error.message,
            userId: member.id,
            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
        });
    }
}

async function handleBoostEnd(member) {
    try {
        // Cancel any existing warning jobs
        cancelExistingWarningJob(member.id);

        // Get all roles before clearing
        const userRoles = await RoleManager.getUserRoles(member.guild.id, member.id);
        
        // Track success/failure for each role
        const results = {
            success: [],
            failed: []
        };

        // Remove all custom roles created by this booster
        for (const roleData of userRoles) {
            try {
                const role = await member.guild.roles.fetch(roleData.roleId);
                if (role) {
                    // Get target member
                    const targetMember = await member.guild.members.fetch(roleData.targetId);
                    if (targetMember) {
                        await targetMember.roles.remove(role);
                    }
                    await role.delete('Boost ended');
                    results.success.push(roleData.roleId);
                }
            } catch (roleError) {
                console.error(`Error removing role ${roleData.roleId}:`, roleError);
                results.failed.push(roleData.roleId);
            }
        }

        // Clear user's custom roles from database
        await RoleManager.clearUserRoles(member.guild.id, member.id);

        // Remove active message if exists
        const messageId = await RoleManager.getActiveMessage(member.id);
        if (messageId) {
            try {
                const dmChannel = await member.createDM();
                const message = await dmChannel.messages.fetch(messageId);
                if (message) await message.delete();
            } catch (messageError) {
                console.warn('Error deleting message:', messageError);
            }
        }

        // Log the boost end event with results
        await Logger.log('BOOST_END', {
            userId: member.id,
            results: {
                successCount: results.success.length,
                failedCount: results.failed.length,
                failedRoles: results.failed
            },
            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
        });

        // Try to notify user
        try {
            await member.send({
                embeds: [
                    EmbedService.info(
                        'Boost Berakhir',
                        [
                            '🔔 Server boost Anda telah berakhir.',
                            '',
                            `✅ ${results.success.length} role berhasil dihapus`,
                            results.failed.length > 0 ? `❌ ${results.failed.length} role gagal dihapus` : '',
                            '',
                            'Semua custom role yang terkait telah dihapus dari database.'
                        ].filter(Boolean).join('\n')
                    )
                ]
            });
        } catch (dmError) {
            console.warn(`Unable to send boost end notification to ${member.user.tag}:`, dmError);
            await Logger.log('WARNING', {
                type: 'DM_FAILED',
                userId: member.id,
                reason: 'Unable to send boost end notification',
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });
        }

    } catch (error) {
        console.error('Error handling boost end:', error);
        await Logger.log('ERROR', {
            type: 'BOOST_END_HANDLER',
            error: error.message,
            userId: member.id,
            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
        });
    }
}

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

function cancelExistingWarningJob(userId) {
    const existingJob = scheduledJobs.get(userId);
    if (existingJob) {
        existingJob.cancel();
        scheduledJobs.delete(userId);
    }
}

async function scheduleBoostWarning(member) {
    try {
        // Calculate warning time (24h before boost ends)
        const boostEndDate = new Date(member.premiumSince);
        boostEndDate.setDate(boostEndDate.getDate() + 30);
        
        const warningDate = new Date(boostEndDate);
        warningDate.setDate(warningDate.getDate() - 1);

        // Only schedule if warning time is in the future
        if (warningDate > new Date()) {
            // Cancel any existing job first
            cancelExistingWarningJob(member.id);

            // Schedule new warning
            const job = schedule.scheduleJob(warningDate, async () => {
                try {
                    // Verify member is still boosting
                    const updatedMember = await member.guild.members.fetch(member.id);
                    if (!updatedMember?.premiumSince) return;

                    // Try to send warning DM
                    try {
                        await member.send({
                            embeds: [
                                EmbedService.warning(
                                    '⚠️ Peringatan Boost',
                                    [
                                        'Boost Anda akan berakhir dalam 24 jam.',
                                        '',
                                        '• Pastikan untuk memperpanjang boost agar custom role Anda tetap aktif',
                                        '• Jika boost berakhir, semua custom role akan dihapus',
                                        '',
                                        `Waktu berakhir: ${moment(boostEndDate).tz('Asia/Jakarta').format('DD MMMM YYYY HH:mm:ss')}`
                                    ].join('\n')
                                )
                            ]
                        });

                        // Log successful warning
                        await Logger.log('BOOST_WARNING_SENT', {
                            userId: member.id,
                            expiryTime: boostEndDate.toISOString(),
                            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
                        });
                    } catch (dmError) {
                        console.warn(`Unable to send boost warning to ${member.user.tag}:`, dmError);
                        await Logger.log('WARNING', {
                            type: 'DM_FAILED',
                            userId: member.id,
                            reason: 'Unable to send boost warning',
                            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
                        });
                    }
                } catch (error) {
                    console.error('Error in boost warning job:', error);
                    await Logger.log('ERROR', {
                        type: 'BOOST_WARNING_JOB',
                        error: error.message,
                        userId: member.id,
                        timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
                    });
                } finally {
                    // Clean up job from tracking
                    scheduledJobs.delete(member.id);
                }
            });

            // Track the job
            scheduledJobs.set(member.id, job);

            // Log scheduled warning
            await Logger.log('BOOST_WARNING_SCHEDULED', {
                userId: member.id,
                scheduledFor: warningDate.toISOString(),
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });
        }
    } catch (error) {
        console.error('Error scheduling boost warning:', error);
        await Logger.log('ERROR', {
            type: 'BOOST_WARNING_SCHEDULE',
            error: error.message,
            userId: member.id,
            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
        });
    }
}
