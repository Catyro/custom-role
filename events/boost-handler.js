const { Events } = require('discord.js');
const EmbedService = require('../utils/embed-builder');
const Logger = require('../utils/logger');
const config = require('../config');
const moment = require('moment-timezone');

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        // Check if member started boosting
        if (!oldMember.premiumSince && newMember.premiumSince) {
            await handleNewBoost(newMember);
        }
        // Check if member stopped boosting
        else if (oldMember.premiumSince && !newMember.premiumSince) {
            await handleBoostEnd(newMember);
        }
    }
};

async function handleNewBoost(member) {
    try {
        // Log the boost
        await Logger.log('BOOST', {
            type: 'NEW_BOOST',
            userId: member.id,
            guildId: member.guild.id,
            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
        });

        // Send welcome message to the booster
        await member.send({
            embeds: [
                EmbedService.createEmbed({
                    title: '🎉 Thank You for Boosting!',
                    description: [
                        `Thank you for boosting **${member.guild.name}**!`,
                        '\nYou now have access to the following perks:',
                        '• Create custom roles with unique colors and icons',
                        '• Edit your custom roles anytime',
                        '• Special booster recognition',
                        '\nUse `/boost-leaderboard` to see your boost status!',
                        'Use `/create-role` to create your custom role!'
                    ].join('\n'),
                    color: config.EMBED_COLORS.SUCCESS,
                    footer: { text: 'Thank you for your support! 💖' }
                })
            ]
        });

    } catch (error) {
        console.error('Error handling new boost:', error);
        await Logger.log('ERROR', {
            type: 'BOOST_HANDLER',
            error: error.message,
            userId: member.id,
            guildId: member.guild.id,
            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
        });
    }
}

async function handleBoostEnd(member) {
    try {
        // Log the boost end
        await Logger.log('BOOST', {
            type: 'BOOST_END',
            userId: member.id,
            guildId: member.guild.id,
            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
        });

        // Send notification to the member
        await member.send({
            embeds: [
                EmbedService.createEmbed({
                    title: '💔 Boost Ended',
                    description: [
                        `Your server boost for **${member.guild.name}** has ended.`,
                        '\nAs a result:',
                        '• Your custom roles will be removed in 24 hours',
                        '• You will lose access to booster-only features',
                        '\nBoost the server again to keep your perks!',
                        'Thank you for your previous support!'
                    ].join('\n'),
                    color: config.EMBED_COLORS.WARNING,
                    footer: { text: 'Hope to see you boost again soon! 💖' }
                })
            ]
        });

        // Note: Role removal is handled by the periodic check in index.js
        // This gives members a grace period and prevents immediate role removal

    } catch (error) {
        console.error('Error handling boost end:', error);
        await Logger.log('ERROR', {
            type: 'BOOST_HANDLER',
            error: error.message,
            userId: member.id,
            guildId: member.guild.id,
            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
        });
    }
}