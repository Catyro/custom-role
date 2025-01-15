const { 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder 
} = require('discord.js');
const Logger = require('./logger');
const config = require('../config');
const moment = require('moment-timezone');

class RoleManager {
    /**
     * Membuat custom role untuk member
     * @param {GuildMember} member - Member yang akan diberi role
     * @param {Object} options - Opsi role
     * @returns {Promise<Role>} Role yang dibuat
     */
    async createCustomRole(member, options) {
        try {
            // Validate role name
            const roleName = this.validateRoleName(options.name || `[Custom] ${member.user.username}`);
            
            // Validate role color
            const roleColor = this.validateColor(options.color || config.EMBED_COLORS.PRIMARY);

            // Create role
            const role = await member.guild.roles.create({
                name: roleName,
                color: roleColor,
                reason: `Custom role untuk ${member.user.tag}`,
                permissions: []
            });

            // Assign role to member
            await member.roles.add(role);

            // Log role creation
            await Logger.log('ROLE', {
                type: 'ROLE_CREATED',
                roleId: role.id,
                userId: member.id,
                guildId: member.guild.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

            return role;

        } catch (error) {
            console.error('Error creating custom role:', error);
            throw error;
        }
    }

    /**
     * Membuat role test
     * @param {Guild} guild - Guild tempat role dibuat
     * @param {Object} options - Opsi role test
     * @returns {Promise<Role>} Role test yang dibuat
     */
    async createTestRole(guild, options) {
        try {
            const member = await guild.members.fetch(options.userId);
            const duration = options.duration || config.ROLE_LIMITS.DEFAULT_TEST_DURATION;

            // Create temporary role
            const role = await this.createCustomRole(member, {
                name: `[Test] ${options.name || member.user.username}`,
                color: options.color
            });

            // Set timeout to delete role
            setTimeout(async () => {
                try {
                    await role.delete('Test role duration expired');
                    await Logger.log('ROLE', {
                        type: 'TEST_ROLE_EXPIRED',
                        roleId: role.id,
                        userId: member.id,
                        guildId: guild.id,
                        timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
                    });
                } catch (error) {
                    console.error('Error deleting test role:', error);
                }
            }, duration);

            return role;

        } catch (error) {
            console.error('Error creating test role:', error);
            throw error;
        }
    }

    /**
     * Menampilkan modal edit role
     * @param {Interaction} interaction - Interaction dari button
     * @param {string} roleId - ID role yang akan diedit
     */
    async showEditModal(interaction, roleId) {
        try {
            const role = await interaction.guild.roles.fetch(roleId);
            if (!role) throw new Error('Role tidak ditemukan');

            const modal = new ModalBuilder()
                .setCustomId(`edit_role_${roleId}`)
                .setTitle('Edit Custom Role');

            const nameInput = new TextInputBuilder()
                .setCustomId('role_name')
                .setLabel('Nama Role')
                .setStyle(TextInputStyle.Short)
                .setMaxLength(32)
                .setValue(role.name)
                .setRequired(true);

            const colorInput = new TextInputBuilder()
                .setCustomId('role_color')
                .setLabel('Warna Role (HEX)')
                .setStyle(TextInputStyle.Short)
                .setMaxLength(7)
                .setValue(role.hexColor)
                .setRequired(true);

            const iconInput = new TextInputBuilder()
                .setCustomId('role_icon')
                .setLabel('Icon Role URL (Opsional)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false);

            const firstRow = new ActionRowBuilder().addComponents(nameInput);
            const secondRow = new ActionRowBuilder().addComponents(colorInput);
            const thirdRow = new ActionRowBuilder().addComponents(iconInput);

            modal.addComponents(firstRow, secondRow, thirdRow);
            await interaction.showModal(modal);

        } catch (error) {
            console.error('Error showing edit modal:', error);
            throw error;
        }
    }

    /**
     * Mengedit role
     * @param {Role} role - Role yang akan diedit
     * @param {Object} options - Opsi edit role
     */
    async editRole(role, options) {
        try {
            const updateData = {};

            if (options.name) {
                updateData.name = this.validateRoleName(options.name);
            }

            if (options.color) {
                updateData.color = this.validateColor(options.color);
            }

            if (options.icon) {
                updateData.icon = await this.validateIcon(options.icon);
            }

            await role.edit(updateData);

            await Logger.log('ROLE', {
                type: 'ROLE_EDITED',
                roleId: role.id,
                updates: Object.keys(updateData),
                guildId: role.guild.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

        } catch (error) {
            console.error('Error editing role:', error);
            throw error;
        }
    }

    /**
     * Menghapus custom role
     * @param {GuildMember} member - Member pemilik role
     */
    async removeCustomRole(member) {
        try {
            const customRole = member.roles.cache.find(role => 
                role.name.startsWith('[Custom]') || role.name.startsWith('[Test]')
            );

            if (customRole) {
                await customRole.delete('Boost ended or role removal requested');
                await Logger.log('ROLE', {
                    type: 'ROLE_REMOVED',
                    roleId: customRole.id,
                    userId: member.id,
                    guildId: member.guild.id,
                    timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
                });
            }

        } catch (error) {
            console.error('Error removing custom role:', error);
            throw error;
        }
    }

    /**
     * Validasi nama role
     * @param {string} name - Nama role yang akan divalidasi
     * @returns {string} Nama role yang valid
     */
    validateRoleName(name) {
        if (!name || name.length < 1) {
            throw new Error('Nama role tidak boleh kosong');
        }

        if (name.length > config.ROLE_LIMITS.MAX_NAME_LENGTH) {
            throw new Error(`Nama role tidak boleh lebih dari ${config.ROLE_LIMITS.MAX_NAME_LENGTH} karakter`);
        }

        // Remove unsafe characters
        return name.replace(/[^\w\s\[\]\-]/g, '');
    }

    /**
     * Validasi warna role
     * @param {string} color - Warna yang akan divalidasi
     * @returns {string} Warna yang valid
     */
    validateColor(color) {
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!hexRegex.test(color)) {
            throw new Error('Format warna tidak valid (gunakan format HEX, contoh: #FF0000)');
        }
        return color;
    }

    /**
     * Validasi URL icon
     * @param {string} url - URL icon yang akan divalidasi
     * @returns {Promise<string>} URL yang valid
     */
    async validateIcon(url) {
        if (!url) return null;

        try {
            const response = await fetch(url);
            const contentType = response.headers.get('content-type');
            const contentLength = response.headers.get('content-length');

            if (!contentType.startsWith('image/')) {
                throw new Error('URL harus mengarah ke file gambar');
            }

            if (contentLength > config.ROLE_LIMITS.MAX_ICON_SIZE) {
                throw new Error(`Ukuran icon tidak boleh lebih dari ${config.ROLE_LIMITS.MAX_ICON_SIZE / 1024}KB`);
            }

            return url;

        } catch (error) {
            throw new Error('URL icon tidak valid');
        }
    }
}

module.exports = new RoleManager();