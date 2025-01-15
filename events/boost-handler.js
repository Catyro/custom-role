const { EmbedBuilder } = require('discord.js');
const RoleManager = require('../utils/role-manager');
const Logger = require('../utils/logger');
const moment = require('moment-timezone');

module.exports = {
    name: 'guildMemberUpdate',
    async execute(oldMember, newMember) {
        // Check if member started boosting
        if (!oldMember.premiumSince && newMember.premiumSince) {
            try {
                // Create custom role for booster
                const role = await RoleManager.createCustomRole(newMember, {
                    name: `[Custom] ${newMember.user.username}`,
                    color: '#f47fff'
                });

                // Create boost notification embed
                const boostEmbed = {
                    title: '🌟 Server Boost!',
                    description: `Terima kasih ${newMember} telah boost server ini!\nSebagai hadiah, kamu mendapatkan custom role!`,
                    fields: [
                        {
                            name: '🎨 Role Kamu',
                            value: role.toString(),
                            inline: true
                        },
                        {
                            name: '📝 Cara Menggunakan',
                            value: 'Gunakan `/edit-role` untuk mengustomisasi role kamu!',
                            inline: true
                        }
                    ],
                    color: 0xf47fff,
                    thumbnail: {
                        url: newMember.user.displayAvatarURL({ dynamic: true })
                    },
                    timestamp: new Date()
                };

                // Send notification
                const channel = newMember.guild.systemChannel;
                if (channel) {
                    await channel.send({
                        content: newMember.toString(),
                        embeds: [boostEmbed]
                    });
                }

                // Log the boost
                await Logger.log('BOOST', {
                    guildId: newMember.guild.id,
                    type: 'MEMBER_BOOSTED',
                    userId: newMember.id,
                    roleId: role.id,
                    timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
                });

            } catch (error) {
                console.error('Error handling boost:', error);
            }
        }
        // Check if member stopped boosting
        else if (oldMember.premiumSince && !newMember.premiumSince) {
            try {
                // Remove custom role
                await RoleManager.removeCustomRole(newMember);

                // Log the unboost
                await Logger.log('BOOST', {
                    guildId: newMember.guild.id,
                    type: 'MEMBER_UNBOOSTED',
                    userId: newMember.id,
                    timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
                });

            } catch (error) {
                console.error('Error handling unboost:', error);
            }
        }
    }
};