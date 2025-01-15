const { PermissionsBitField } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const Validator = require('./validator');
const Logger = require('./logger');

class RoleManager {
    static #rolesPath = path.join(__dirname, '..', 'data', 'roles.json');

    /**
     * Creates a test role for a user
     * @param {Guild} guild - Discord guild
     * @param {Object} options - Role options
     * @returns {Promise<Role>} Created role
     */
    static async createTestRole(guild, options) {
        try {
            const { userId, name, color } = options;

            // Create role with specific permissions
            const role = await guild.roles.create({
                name: name || '[TEST] Custom Role',
                color: color || '#99AAB5',
                permissions: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                ],
                reason: `Test role created for user ID: ${userId}`
            });

            // Save role data
            await this.#saveRoleData(guild.id, {
                roleId: role.id,
                userId: userId,
                type: 'TEST',
                createdAt: '2025-01-15 10:04:15',
                createdBy: 'Catyro'
            });

            return role;
        } catch (error) {
            console.error('Error creating test role:', error);
            throw error;
        }
    }

    /**
     * Creates a custom role for a booster
     * @param {Guild} guild - Discord guild
     * @param {Object} options - Role options
     * @returns {Promise<Role>} Created role
     */
    static async createBoostRole(guild, options) {
        try {
            const { userId, name, color } = options;

            // Validate role name
            const nameValidation = Validator.validateRoleName(name);
            if (!nameValidation.isValid) {
                throw new Error(nameValidation.message);
            }

            // Create role
            const role = await guild.roles.create({
                name: name,
                color: color || '#F47FFF',
                permissions: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                ],
                reason: `Boost role created for user ID: ${userId}`
            });

            // Save role data
            await this.#saveRoleData(guild.id, {
                roleId: role.id,
                userId: userId,
                type: 'BOOST',
                createdAt: '2025-01-15 10:04:15',
                createdBy: 'Catyro'
            });

            return role;
        } catch (error) {
            console.error('Error creating boost role:', error);
            throw error;
        }
    }

    /**
     * Updates a role's properties
     * @param {Role} role - Discord role
     * @param {Object} options - Update options
     */
    static async updateRole(role, options) {
        try {
            const updates = {};

            if (options.name) {
                const nameValidation = Validator.validateRoleName(options.name);
                if (nameValidation.isValid) {
                    updates.name = options.name;
                }
            }

            if (options.color) {
                const validColor = Validator.validateColor(options.color);
                if (validColor) {
                    updates.color = validColor;
                }
            }

            if (options.icon) {
                const validIcon = await Validator.validateIconUrl(options.icon);
                if (validIcon) {
                    updates.icon = options.icon;
                }
            }

            if (Object.keys(updates).length > 0) {
                await role.edit(updates);
                
                await Logger.log('ROLE_UPDATE', {
                    guildId: role.guild.id,
                    type: 'ROLE_UPDATE',
                    roleId: role.id,
                    updates: updates,
                    updatedAt: '2025-01-15 10:04:15',
                    updatedBy: 'Catyro'
                });
            }
        } catch (error) {
            console.error('Error updating role:', error);
            throw error;
        }
    }

    /**
     * Gets all roles for a guild
     * @param {string} guildId - Guild ID
     * @returns {Promise<Array>} Array of roles
     */
    static async getRoles(guildId) {
        try {
            const roles = await this.#loadRoles();
            return roles.filter(role => role.guildId === guildId);
        } catch (error) {
            console.error('Error getting roles:', error);
            return [];
        }
    }

    /**
     * Saves role data to file
     * @private
     */
    static async #saveRoleData(guildId, roleData) {
        try {
            const roles = await this.#loadRoles();
            roles.push({
                guildId,
                ...roleData
            });
            await fs.writeFile(this.#rolesPath, JSON.stringify(roles, null, 2));
        } catch (error) {
            console.error('Error saving role data:', error);
            throw error;
        }
    }

    /**
     * Loads roles from file
     * @private
     */
    static async #loadRoles() {
        try {
            const data = await fs.readFile(this.#rolesPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return [];
        }
    }

    /**
     * Removes a role's data from storage
     * @param {string} roleId - Role ID to remove
     */
    static async removeRoleData(roleId) {
        try {
            const roles = await this.#loadRoles();
            const filteredRoles = roles.filter(role => role.roleId !== roleId);
            await fs.writeFile(this.#rolesPath, JSON.stringify(filteredRoles, null, 2));
        } catch (error) {
            console.error('Error removing role data:', error);
            throw error;
        }
    }
}

module.exports = RoleManager;
