const { Events } = require('discord.js');
const CustomEmbedBuilder = require('../utils/embed-builder');
const RoleManager = require('../utils/role-manager');
const Logger = require('../utils/logger');

module.exports = {
    name: Events.GuildMemberUpdate,
    async execute(oldMember, newMember) {
        try {
            // Check if member started boosting
            if (!oldMember.premiumSince && newMember.premiumSince) {
                await handleNewBooster(newMember);
            }
            // Check if member stopped boosting
            else if (oldMember.premiumSince && !newMember.premiumSince) {
                await handleBoostEnd(newMember);
            }
        } catch (error) {
            console.error('Error in boost handler:', error);
            await Logger.log('ERROR', {
                guildId: newMember.guild.id,
                type: 'BOOST_HANDLER_ERROR',
                error: error.message,
                userId: newMember.id,
                timestamp: '2025-01-15 10:04:15'
            });
        }
    }
};

async function handleNewBooster(member) {
    try {
        // Create welcome embed
        const embed = new CustomEmbedBuilder()
            .setBoost('🎉 Server Boosted!',
                `Terimakasih <@${member.id}> telah melakukan boost ke server!\n` +
                'Kamu bisa membuat custom role spesial untukmu.')
            .addFields([
                { name: '👤 Booster', value: `<@${member.id}>`, inline: true },
                { name: '📅 Tanggal', value: '2025-01-15 10:04:15', inline: true }
            ]);

        // Send DM to booster
        const dmEmbed = new CustomEmbedBuilder()
            .setBoost('🎉 Terimakasih sudah boost Server kami!',
                'Untuk membuat custom role spesialmu, gunakan form dibawah ini.')
            .addFields([
                { name: '🎨 Ketentuan Role:', value: 
                    '• Nama role bebas (2-100 karakter)\n' +
                    '• Warna role bebas (HEX atau nama warna)\n' +
                    '• Bisa menambahkan icon role (opsional)\n' +
                    '• Tidak mengandung kata-kata tidak pantas' }
            ]);

        await member.send({ embeds: [dmEmbed] }).catch(() => {
            console.log(`Couldn't send DM to ${member.user.tag}`);
        });

        // Log boost event
        await Logger.log('BOOST', {
            guildId: member.guild.id,
            type: 'NEW_BOOST',
            userId: member.id,
            timestamp: '2025-01-15 10:04:15'
        });

    } catch (error) {
        console.error('Error handling new booster:', error);
        throw error;
    }
}

async function handleBoostEnd(member) {
    try {
        // Find and remove boost roles
        const roles = await RoleManager.getRoles(member.guild.id);
        const boostRoles = roles.filter(role => 
            role.userId === member.id && 
            role.type === 'BOOST'
        );

        for (const roleData of boostRoles) {
            const role = await member.guild.roles.fetch(roleData.roleId);
            if (role) {
                await member.roles.remove(role);
                await role.delete('Boost ended');
                await RoleManager.removeRoleData(role.id);
            }
        }

        // Log boost end
        await Logger.log('BOOST', {
            guildId: member.guild.id,
            type: 'BOOST_END',
            userId: member.id,
            timestamp: '2025-01-15 10:04:15'
        });

    } catch (error) {
        console.error('Error handling boost end:', error);
        throw error;
    }
}
