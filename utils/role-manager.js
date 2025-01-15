const Logger = require('./logger');
const moment = require('moment-timezone');

class RoleManager {
    /**
     * Membuat custom role untuk member
     * @param {GuildMember} member - Member yang akan diberi role
     * @param {Object} options - Opsi role
     * @returns {Promise<Role>} Role yang dibuat
     */
    async createCustomRole(member, options = {}) {
        try {
            // Validate role name
            const roleName = this.validateRoleName(options.name || `[Custom] ${member.user.username}`);
            
            // Validate role color
            const roleColor = this.validateColor(options.color || '#f47fff');

            // Create role
            const role = await member.guild.roles.create({
                name: roleName,
                color: roleColor,
                reason: `Custom role untuk ${member.user.tag}`,
                permissions: []
            });

            // Position the role just below the bot's highest role
            const botMember = member.guild.members.cache.get(member.client.user.id);
            const highestRole = botMember.roles.highest;
            await role.setPosition(highestRole.position - 1);

            // Assign role to member
            await member.roles.add(role);

            // Log role creation
            await Logger.log('ROLE_CREATE', {
                guildId: member.guild.id,
                type: 'ROLE_CREATED',
                roleId: role.id,
                userId: member.id,
                roleName: roleName,
                roleColor: roleColor,
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
            const duration = options.duration || 300000; // Default 5 minutes

            // Create temporary role
            const role = await this.createCustomRole(member, {
                name: `[Test] ${options.name || member.user.username}`,
                color: options.color || '#007bff'
            });

            // Set timeout to delete role
            setTimeout(async () => {
                try {
                    if (role && !role.deleted) {
                        await role.delete('Test role duration expired');
                        await Logger.log('ROLE_DELETE', {
                            guildId: guild.id,
                            type: 'TEST_ROLE_EXPIRED',
                            roleId: role.id,
                            userId: member.id,
                            timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
                        });
                    }
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
     * Mengedit role
     * @param {Role} role - Role yang akan diedit
     * @param {Object} options - Opsi edit role
     */
    async editRole(role, options = {}) {
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

            await Logger.log('ROLE_EDIT', {
                guildId: role.guild.id,
                type: 'ROLE_EDITED',
                roleId: role.id,
                updates: updateData,
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

            if (customRole && !customRole.deleted) {
                await customRole.delete('Role removal requested or boost ended');
                await Logger.log('ROLE_DELETE', {
                    guildId: member.guild.id,
                    type: 'ROLE_REMOVED',
                    roleId: customRole.id,
                    userId: member.id,
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
        if (!name || typeof name !== 'string') {
            throw new Error('Nama role tidak valid');
        }

        // Remove unsafe characters and trim
        name = name.replace(/[^\w\s\[\]\-]/g, '').trim();

        if (name.length < 1) {
            throw new Error('Nama role tidak boleh kosong');
        }

        if (name.length > 32) {
            throw new Error('Nama role tidak boleh lebih dari 32 karakter');
        }

        return name;
    }

    /**
     * Validasi warna role
     * @param {string} color - Warna yang akan divalidasi
     * @returns {string} Warna yang valid
     */
    validateColor(color) {
        const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!color || !hexRegex.test(color)) {
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
            if (!response.ok) {
                throw new Error('URL tidak dapat diakses');
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.startsWith('image/')) {
                throw new Error('URL harus mengarah ke file gambar');
            }

            return url;

        } catch (error) {
            throw new Error('URL icon tidak valid: ' + error.message);
        }
    }
}

module.exports = new RoleManager();