const { PermissionsBitField } = require('discord.js');
const Validator = require('./validator');
const Logger = require('./logger');
const moment = require('moment');

class RoleManager {
    /**
     * Creates a custom role for a booster
     * @param {Guild} guild - Discord guild
     * @param {Object} options - Role options
     * @returns {Promise<Role>} Created role
     */
    static async createCustomRole(guild, options) {
        try {
            const { userId, name, color, icon = null } = options;

            // Validate role name
            const nameValidation = Validator.validateRoleName(name);
            if (!nameValidation.isValid) {
                throw new Error(nameValidation.message);
            }

            // Validate color
            const validColor = Validator.validateColor(color);
            if (!validColor) {
                throw new Error('Warna role tidak valid.');
            }

            // Validate icon if provided
            if (icon && !Validator.validateIconUrl(icon)) {
                throw new Error('URL icon tidak valid.');
            }

            // Create role
            const role = await guild.roles.create({
                name: name,
                color: validColor,
                hoist: true, // Show members separately
                mentionable: true,
                reason: `Custom role created for user ID: ${userId}`
            });

            // Set icon if provided
            if (icon) {
                await role.setIcon(icon)
                    .catch(error => {
                        console.error('Error setting role icon:', error);
                        Logger.log('ERROR', {
                            type: 'ROLE_ICON_ERROR',
                            roleId: role.id,
                            error: error.message,
                            timestamp: '2025-01-15 08:13:20'
                        });
                    });
            }

            // Log role creation
            await Logger.log('ROLE_CREATE', {
                type: 'CUSTOM_ROLE_CREATE',
                guildId: guild.id,
                roleId: role.id,
                userId: userId,
                timestamp: '2025-01-15 08:13:20'
            });

            return role;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Creates a temporary test role
     * @param {Guild} guild - Discord guild
     * @param {Object} options - Role options
     * @returns {Promise<Role>} Created test role
     */
    static async createTestRole(guild, options) {
        try {
            const { userId, name, color, duration = 120000 } = options; // Default 2 minutes

            // Create role with [TEST] prefix
            const testRole = await guild.roles.create({
                name: `[TEST] ${name}`,
                color: color,
                hoist: true,
                mentionable: true,
                reason: `Test role created for user ID: ${userId}`
            });

            // Log test role creation
            await Logger.log('ROLE_CREATE', {
                type: 'TEST_ROLE_CREATE',
                guildId: guild.id,
                roleId: testRole.id,
                userId: userId,
                duration: duration,
                timestamp: '2025-01-15 08:13:20'
            });

            return testRole;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Updates an existing role
     * @param {Role} role - Discord role
     * @param {Object} options - Update options
     * @returns {Promise<Role>} Updated role
     */
    static async updateRole(role, options) {
        try {
            const updates = {};

            // Validate and set name
            if (options.name) {
                const nameValidation = Validator.validateRoleName(options.name);
                if (!nameValidation.isValid) {
                    throw new Error(nameValidation.message);
                }
                updates.name = options.name;
            }

            // Validate and set color
            if (options.color) {
                const validColor = Validator.validateColor(options.color);
                if (!validColor) {
                    throw new Error('Warna role tidak valid.');
                }
                updates.color = validColor;
            }

            // Update role
            const updatedRole = await role.edit(updates, 
                `Role updated by user ID: ${options.updatedBy}`);

            // Update icon if provided
            if (options.icon) {
                if (!Validator.validateIconUrl(options.icon)) {
                    throw new Error('URL icon tidak valid.');
                }
                await updatedRole.setIcon(options.icon);
            }

            // Log role update
            await Logger.log('ROLE_UPDATE', {
                type: 'ROLE_UPDATE',
                guildId: role.guild.id,
                roleId: role.id,
                updatedBy: options.updatedBy,
                changes: updates,
                timestamp: '2025-01-15 08:13:20'
            });

            return updatedRole;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Deletes a role
     * @param {Role} role - Discord role
     * @param {string} reason - Reason for deletion
     * @returns {Promise<void>}
     */
    static async deleteRole(role, reason = '') {
        try {
            const roleData = {
                id: role.id,
                guildId: role.guild.id,
                name: role.name
            };

            await role.delete(reason);

            // Log role deletion
            await Logger.log('ROLE_DELETE', {
                type: 'ROLE_DELETE',
                guildId: roleData.guildId,
                roleId: roleData.id,
                roleName: roleData.name,
                reason: reason,
                timestamp: '2025-01-15 08:13:20'
            });

        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets role data including members
     * @param {Role} role - Discord role
     * @returns {Object} Role data
     */
    static getRoleData(role) {
        return {
            id: role.id,
            name: role.name,
            color: role.hexColor,
            memberCount: role.members.size,
            createdAt: moment(role.createdAt).utc().format('YYYY-MM-DD HH:mm:ss'),
            isHoisted: role.hoist,
            isMentionable: role.mentionable,
            position: role.position,
            members: Array.from(role.members.values()).map(member => ({
                id: member.id,
                tag: member.user.tag,
                joinedAt: moment(member.joinedAt).utc().format('YYYY-MM-DD HH:mm:ss')
            }))
        };
    }

    /**
     * Checks if a role is a test role
     * @param {Role} role - Discord role
     * @returns {boolean}
     */
    static isTestRole(role) {
        return role.name.startsWith('[TEST]');
    }

    /**
     * Gets all test roles in a guild
     * @param {Guild} guild - Discord guild
     * @returns {Collection<Role>}
     */
    static getTestRoles(guild) {
        return guild.roles.cache.filter(role => this.isTestRole(role));
    }

    /**
     * Checks if a member can manage a specific role
     * @param {GuildMember} member - Discord guild member
     * @param {Role} role - Discord role
     * @returns {boolean}
     */
    static canManageRole(member, role) {
        if (!member || !role) return false;

        // Check if member has MANAGE_ROLES permission
        if (!member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return false;
        }

        // Check if member's highest role is higher than the target role
        return member.roles.highest.position > role.position;
    }
}

module.exports = RoleManager;
