const { roleData } = require('../data/roles.json');
const Logger = require('./logger');
const Validator = require('./validator');
const moment = require('moment-timezone');

class RoleManager {
    /**
     * Create a custom role for a booster
     * @param {GuildMember} member - The member to create the role for
     * @param {Object} options - Role options
     * @returns {Promise<Role>} The created role
     */
    static async createCustomRole(member, options = {}) {
        try {
            const { name, color, icon } = options;

            // Validate inputs
            if (!Validator.isValidRoleName(name)) {
                throw new Error('Invalid role name');
            }
            if (!Validator.isValidColor(color)) {
                throw new Error('Invalid color code');
            }
            if (icon && !Validator.isValidImageUrl(icon)) {
                throw new Error('Invalid icon URL');
            }

            // Create the role
            const role = await member.guild.roles.create({
                name: name,
                color: color,
                hoist: true,
                mentionable: true,
                reason: `Custom role for ${member.user.tag}`,
                icon: icon || undefined
            });

            // Give the role to the member
            await member.roles.add(role);

            // Save role data
            await this.saveRoleData(member.guild.id, role.id, {
                userId: member.id,
                createdAt: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

            // Log role creation
            await Logger.log('ROLE_CREATED', {
                guildId: member.guild.id,
                type: 'ROLE_CREATE',
                userId: member.id,
                roleId: role.id,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

            return role;

        } catch (error) {
            console.error('Error creating custom role:', error);
            throw error;
        }
    }

    /**
     * Create a temporary test role
     * @param {Guild} guild - The guild to create the role in
     * @param {Object} options - Role options
     * @returns {Promise<Role>} The created role
     */
    static async createTestRole(guild, options = {}) {
        try {
            const { userId, name, color, duration } = options;

            // Create the role
            const role = await guild.roles.create({
                name: name,
                color: color,
                hoist: true,
                mentionable: true,
                reason: `Test role (${duration/60000} minutes)`
            });

            // Give the role to the member
            const member = await guild.members.fetch(userId);
            await member.roles.add(role);

            // Log test role creation
            await Logger.log('TEST_ROLE_CREATED', {
                guildId: guild.id,
                type: 'TEST_ROLE_CREATE',
                userId: userId,
                roleId: role.id,
                duration: duration,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

            return role;

        } catch (error) {
            console.error('Error creating test role:', error);
            throw error;
        }
    }

    /**
     * Edit an existing custom role
     * @param {Role} role - The role to edit
     * @param {Object} options - New role options
     * @returns {Promise<Role>} The updated role
     */
    static async editRole(role, options = {}) {
        try {
            const { name, color, icon } = options;

            // Validate inputs
            if (!Validator.isValidRoleName(name)) {
                throw new Error('Invalid role name');
            }
            if (!Validator.isValidColor(color)) {
                throw new Error('Invalid color code');
            }
            if (icon && !Validator.isValidImageUrl(icon)) {
                throw new Error('Invalid icon URL');
            }

            // Update the role
            const updatedRole = await role.edit({
                name: name,
                color: color,
                icon: icon || role.icon
            });

            // Log role update
            await Logger.log('ROLE_EDITED', {
                guildId: role.guild.id,
                type: 'ROLE_UPDATE',
                roleId: role.id,
                updates: {
                    name: name,
                    color: color,
                    icon: icon
                },
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

            return updatedRole;

        } catch (error) {
            console.error('Error editing role:', error);
            throw error;
        }
    }

    /**
     * Remove a custom role from a member
     * @param {GuildMember} member - The member to remove the role from
     * @returns {Promise<void>}
     */
    static async removeCustomRole(member) {
        try {
            const customRole = member.roles.cache.find(role => 
                role.name.startsWith('[Custom]') &&
                role.members.has(member.id)
            );

            if (customRole) {
                // Remove role from member
                await member.roles.remove(customRole);

                // Delete the role
                await customRole.delete('Member unboost');

                // Log role removal
                await Logger.log('ROLE_REMOVED', {
                    guildId: member.guild.id,
                    type: 'ROLE_REMOVE',
                    userId: member.id,
                    roleId: customRole.id,
                    timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
                });
            }

        } catch (error) {
            console.error('Error removing custom role:', error);
            throw error;
        }
    }

    /**
     * Save role data to storage
     * @param {string} guildId - Guild ID
     * @param {string} roleId - Role ID
     * @param {Object} data - Role data to save
     * @returns {Promise<void>}
     */
    static async saveRoleData(guildId, roleId, data) {
        try {
            // Implementation for saving role data
            // This would typically involve writing to a database or file
            console.log('Saving role data:', { guildId, roleId, data });
        } catch (error) {
            console.error('Error saving role data:', error);
            throw error;
        }
    }
}

module.exports = RoleManager;
