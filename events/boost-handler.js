const { Events } = require('discord.js');
const schedule = require('node-schedule');
const moment = require('moment-timezone');
const EmbedService = require('../utils/embed-builder');
const RoleManager = require('../utils/role-manager');
const Logger = require('../utils/logger');

// Simpan referensi scheduled jobs
const scheduledJobs = new Map();

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        // Check if member started boosting
        if (!oldMember.premiumSince && newMember.premiumSince) {
            try {
                const boostCount = await RoleManager.getBoostCount(newMember.id);
                const opportunities = boostCount - RoleManager.getUserRoles(newMember.id).length;

                // Coba kirim DM dengan safe handling
                try {
                    const embed = EmbedService.customRole(boostCount, opportunities);
                    const message = await newMember.send({
                        embeds: [embed],
                        components: [createInitialButtons()]
                    });

                    // Store message ID for later reference
                    await RoleManager.setActiveMessage(newMember.id, message.id);
                } catch (dmError) {
                    console.log(`Tidak dapat mengirim DM ke ${newMember.user.tag}: ${dmError.message}`);
                    // Log ke channel khusus jika DM gagal
                    await Logger.log('DM_FAILED', {
                        userId: newMember.id,
                        reason: dmError.message,
                        timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
                    });
                }

                // Log boost start
                await Logger.log('BOOST_START', {
                    userId: newMember.id,
                    guildId: newMember.guild.id,
                    boostCount,
                    opportunities,
                    timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
                });

                // Schedule warning menggunakan node-schedule
                scheduleBoostWarning(newMember);

            } catch (error) {
                console.error('Error handling boost:', error);
                await Logger.log('ERROR', {
                    type: 'BOOST_HANDLER',
                    userId: newMember.id,
                    error: error.message,
                    timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
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
        // Cancel scheduled warnings if any
        const jobKey = `boost_warning_${member.id}`;
        if (scheduledJobs.has(jobKey)) {
            scheduledJobs.get(jobKey).cancel();
            scheduledJobs.delete(jobKey);
        }

        // Remove all custom roles created by this booster
        const userRoles = await RoleManager.getUserRoles(member.guild.id, member.id);
        for (const roleData of userRoles) {
            try {
                const role = await member.guild.roles.fetch(roleData.roleId);
                if (role) {
                    // Get target member dengan safe handling
                    try {
                        const targetMember = await member.guild.members.fetch(roleData.targetId);
                        if (targetMember) {
                            await targetMember.roles.remove(role);
                            
                            // Notify target member
                            try {
                                await targetMember.send({
                                    embeds: [
                                        EmbedService.info(
                                            'Role Dihapus',
                                            `Role ${role.name} telah dihapus karena pemberi boost telah berhenti boost server.`
                                        )
                                    ]
                                });
                            } catch (dmError) {
                                console.log(`Tidak dapat mengirim DM ke ${targetMember.user.tag}`);
                            }
                        }
                    } catch (memberError) {
                        console.error(`Error fetching target member: ${memberError.message}`);
                    }
                    
                    // Delete role
                    await role.delete('Boost ended');
                }
            } catch (roleError) {
                console.error(`Error handling role ${roleData.roleId}: ${roleError.message}`);
            }
        }

        // Clear user's custom roles from database
        await RoleManager.clearUserRoles(member.guild.id, member.id);

        // Remove active message if exists dengan safe handling
        const messageId = await RoleManager.getActiveMessage(member.id);
        if (messageId) {
            try {
                const dmChannel = await member.createDM();
                const message = await dmChannel.messages.fetch(messageId);
                if (message) await message.delete();
            } catch (error) {
                console.log('Error deleting message:', error.message);
            }
        }

        // Log boost end
        await Logger.log('BOOST_END', {
            userId: member.id,
            guildId: member.guild.id,
            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
        });

        // Notify user dengan safe handling
        try {
            await member.send({
                embeds: [
                    EmbedService.info(
                        'Boost Berakhir',
                        'Server boost Anda telah berakhir. Semua custom role yang terkait telah dihapus.'
                    )
                ]
            });
        } catch (dmError) {
            console.log(`Tidak dapat mengirim DM ke ${member.user.tag}`);
        }

    } catch (error) {
        console.error('Error handling boost end:', error);
        await Logger.log('ERROR', {
            type: 'BOOST_END_HANDLER',
            userId: member.id,
            guildId: member.guild.id,
            error: error.message,
            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
        });
    }
}

function scheduleBoostWarning(member) {
    const jobKey = `boost_warning_${member.id}`;

    // Cancel existing job if any
    if (scheduledJobs.has(jobKey)) {
        scheduledJobs.get(jobKey).cancel();
    }

    // Calculate warning time (24 hours before boost ends)
    const boostEndDate = moment(member.premiumSince)
        .add(30, 'days')
        .tz('Asia/Jakarta');
    
    const warningDate = moment(boostEndDate)
        .subtract(24, 'hours')
        .tz('Asia/Jakarta');

    // Only schedule if warning time is in the future
    if (warningDate.isAfter(moment())) {
        const job = schedule.scheduleJob(warningDate.toDate(), async () => {
            try {
                // Check if still boosting
                const updatedMember = await member.guild.members.fetch(member.id);
                if (updatedMember.premiumSince) {
                    try {
                        await member.send({
                            embeds: [
                                EmbedService.warning(
                                    'Peringatan Boost',
                                    [
                                        '⚠️ Boost Anda akan berakhir dalam 24 jam.',
                                        'Pastikan untuk memperpanjang boost agar custom role Anda tetap aktif.',
                                        '',
                                        `Waktu berakhir: ${boostEndDate.format('DD MMMM YYYY HH:mm')} WIB`
                                    ].join('\n')
                                )
                            ]
                        });

                        await Logger.log('BOOST_WARNING_SENT', {
                            userId: member.id,
                            guildId: member.guild.id,
                            expiryDate: boostEndDate.format(),
                            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
                        });
                    } catch (dmError) {
                        console.log(`Tidak dapat mengirim warning DM ke ${member.user.tag}`);
                    }
                }
            } catch (error) {
                console.error('Error in boost warning job:', error);
            } finally {
                // Clean up job reference
                scheduledJobs.delete(jobKey);
            }
        });

        // Store job reference
        scheduledJobs.set(jobKey, job);

        // Log scheduled warning
        Logger.log('BOOST_WARNING_SCHEDULED', {
            userId: member.id,
            guildId: member.guild.id,
            scheduledFor: warningDate.format(),
            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
        });
    }
}
