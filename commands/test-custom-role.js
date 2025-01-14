const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const EmbedService = require('../utils/embed-builder');
const RoleManager = require('../utils/role-manager');

function createInitialButtons() {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('start_custom_role')
                .setLabel('Buat Custom Role')
                .setStyle(ButtonStyle.Primary)
        );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test-custom-role')
        .setDescription('Test simulasi pembuatan custom role seperti saat boost (Admin Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option =>
            option.setName('target')
                .setDescription('User yang akan menerima test DM')
                .setRequired(true))
        .addNumberOption(option =>
            option.setName('duration')
                .setDescription('Durasi test dalam detik (default: 300)')
                .setRequired(false)),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                embeds: [EmbedService.error(
                    'Akses Ditolak',
                    'Command ini hanya untuk Admin!'
                )],
                ephemeral: true
            });
        }

        const target = interaction.options.getUser('target');
        
        // Validasi target
        if (!target) {
            return interaction.reply({
                embeds: [EmbedService.error(
                    'Error',
                    'User tidak ditemukan!'
                )],
                ephemeral: true
            });
        }

        // Validasi dan set durasi
        const duration = Math.max(30, interaction.options.getNumber('duration') || 300);

        try {
            await interaction.deferReply({ ephemeral: true });

            let message;
            // Try-catch untuk DM
            try {
                const embed = EmbedService.customRole(1, 1);
                message = await target.send({
                    embeds: [embed],
                    components: [createInitialButtons()]
                });
            } catch (dmError) {
                return interaction.editReply({
                    embeds: [EmbedService.error(
                        'Error',
                        'Tidak dapat mengirim DM ke user tersebut. Pastikan DM mereka terbuka.'
                    )]
                });
            }

            // Store temporary test data
            await RoleManager.setTestMode(target.id, true);

            // Notify admin
            await interaction.editReply({
                embeds: [EmbedService.success(
                    'Test Mode Aktif',
                    `Test mode telah diaktifkan untuk ${target.tag}\nDurasi: ${duration} detik`
                )]
            });

            // Schedule cleanup
            setTimeout(async () => {
                try {
                    // Remove test role if exists
                    const testRole = await RoleManager.getTestRole(target.id);
                    if (testRole) {
                        const role = interaction.guild.roles.cache.get(testRole.roleId);
                        if (role) {
                            const member = await interaction.guild.members.fetch(testRole.targetId);
                            if (member) await member.roles.remove(role);
                            await role.delete('Test duration ended');
                        }
                    }

                    // Remove test mode
                    await RoleManager.setTestMode(target.id, false);

                    // Delete test DM
                    try {
                        if (message) await message.delete();
                    } catch (e) {
                        console.error('Could not delete test DM:', e);
                    }

                    // Notify target
                    await target.send({
                        embeds: [EmbedService.info(
                            'Test Selesai',
                            'Mode test custom role telah berakhir.'
                        )]
                    });

                } catch (error) {
                    console.error('Error in test cleanup:', error);
                }
            }, duration * 1000);

        } catch (error) {
            console.error('Error in test-custom-role:', error);
            return interaction.editReply({
                embeds: [EmbedService.error(
                    'Error',
                    'Terjadi kesalahan saat memulai test mode.'
                )]
            });
        }
    }
};