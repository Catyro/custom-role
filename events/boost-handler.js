const RoleManager = require('../utils/role-manager');
const EmbedBuilder = require('../utils/embed-builder');
const Logger = require('../utils/logger');
const moment = require('moment-timezone');

module.exports = {
    name: 'guildMemberUpdate',
    async execute(oldMember, newMember) {
        // Check if member started/stopped boosting
        const wasBooster = oldMember.premiumSince !== null;
        const isBooster = newMember.premiumSince !== null;

        try {
            if (!wasBooster && isBooster) {
                // Member started boosting
                await handleNewBooster(newMember);
            } else if (wasBooster && !isBooster) {
                // Member stopped boosting
                await handleBoostEnd(newMember);
            }
        } catch (error) {
            console.error('Error in boost handler:', error);
            await Logger.log('ERROR', {
                guildId: newMember.guild.id,
                type: 'BOOST_HANDLER_ERROR',
                error: error.message,
                userId: newMember.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });
        }
    }
};

async function handleNewBooster(member) {
    try {
        // Create custom role
        const role = await RoleManager.createCustomRole(member, {
            name: `[Custom] ${member.user.username}`,
            color: '#f47fff'
        });

        // Create welcome embed
        const welcomeEmbed = new EmbedBuilder()
            .setCustom('🌟', 'Terima Kasih Telah Boost!', 
                `Hai ${member}, terima kasih telah boost server ini!\n` +
                'Sebagai hadiah, kamu mendapatkan custom role yang bisa kamu edit sesuai keinginan.',
                0xf47fff)
            .addFields([
                { 
                    name: '🎨 Custom Role', 
                    value: `${role}\nGunakan \`/edit-role\` untuk mengedit role kamu.`,
                    inline: false 
                },
                {
                    name: '📝 Ketentuan',
                    value: '• Role akan dihapus jika kamu berhenti boost\n' +
                           '• Nama dan warna role bisa diubah\n' +
                           '• Role tidak memiliki permission khusus',
                    inline: false
                }
            ]);

        // Send DM to booster
        await member.send({ embeds: [welcomeEmbed] }).catch(() => {
            console.log(`Couldn't send DM to ${member.user.tag}`);
        });

        // Log boost event
        await Logger.log('MEMBER_BOOSTED', {
            guildId: member.guild.id,
            type: 'BOOST_START',
            userId: member.id,
            roleId: role.id,
            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
        });

    } catch (error) {
        console.error('Error handling new booster:', error);
        throw error;
    }
}

async function handleBoostEnd(member) {
    try {
        // Remove custom role
        await RoleManager.removeCustomRole(member);

        // Create goodbye embed
        const goodbyeEmbed = new EmbedBuilder()
            .setCustom('💫', 'Boost Berakhir', 
                `Hai ${member}, boost kamu di server ${member.guild.name} telah berakhir.\n` +
                'Custom role kamu telah dihapus. Boost lagi untuk mendapatkan custom role baru!',
                0x7289da);

        // Send DM to former booster
        await member.send({ embeds: [goodbyeEmbed] }).catch(() => {
            console.log(`Couldn't send DM to ${member.user.tag}`);
        });

        // Log unboost event
        await Logger.log('MEMBER_UNBOOSTED', {
            guildId: member.guild.id,
            type: 'BOOST_END',
            userId: member.id,
            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
        });

    } catch (error) {
        console.error('Error handling boost end:', error);
        throw error;
    }
}
