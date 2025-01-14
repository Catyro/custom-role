const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');
const Logger = require('./logger');
const config = require('../config');

class RoleManager {
    static async getRoleData(roleId) {
        try {
            const rolesPath = path.join(__dirname, '..', 'data', 'roles.json');
            const fileContent = await fs.readFile(rolesPath, 'utf8');
            const roles = JSON.parse(fileContent);
            
            return roles.find(role => role.roleId === roleId);
        } catch (error) {
            console.error('Error getting role data:', error);
            return null;
        }
    }

    static async saveRole(roleData) {
        try {
            const rolesPath = path.join(__dirname, '..', 'data', 'roles.json');
            let roles = [];

            try {
                const fileContent = await fs.readFile(rolesPath, 'utf8');
                roles = JSON.parse(fileContent);
            } catch {
                // If file doesn't exist, start with empty array
            }

            // Add new role
            roles.push({
                ...roleData,
                createdAt: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

            await fs.writeFile(rolesPath, JSON.stringify(roles, null, 2));

            await Logger.log('ROLE', {
                type: 'ROLE_SAVE',
                roleId: roleData.roleId,
                userId: roleData.creatorId,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

            return true;
        } catch (error) {
            console.error('Error saving role:', error);
            return false;
        }
    }

    static async updateRole(roleId, updates) {
        try {
            const rolesPath = path.join(__dirname, '..', 'data', 'roles.json');
            const fileContent = await fs.readFile(rolesPath, 'utf8');
            let roles = JSON.parse(fileContent);

            const roleIndex = roles.findIndex(role => role.roleId === roleId);
            if (roleIndex === -1) return false;

            roles[roleIndex] = {
                ...roles[roleIndex],
                ...updates,
                updatedAt: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            };

            await fs.writeFile(rolesPath, JSON.stringify(roles, null, 2));

            await Logger.log('ROLE', {
                type: 'ROLE_UPDATE',
                roleId,
                updates,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

            return true;
        } catch (error) {
            console.error('Error updating role:', error);
            return false;
        }
    }

    static async deleteRole(roleId) {
        try {
            const rolesPath = path.join(__dirname, '..', 'data', 'roles.json');
            const fileContent = await fs.readFile(rolesPath, 'utf8');
            let roles = JSON.parse(fileContent);

            roles = roles.filter(role => role.roleId !== roleId);

            await fs.writeFile(rolesPath, JSON.stringify(roles, null, 2));

            await Logger.log('ROLE', {
                type: 'ROLE_DELETE',
                roleId,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

            return true;
        } catch (error) {
            console.error('Error deleting role:', error);
            return false;
        }
    }

    static async getUserRoles(userId) {
        try {
            const rolesPath = path.join(__dirname, '..', 'data', 'roles.json');
            const fileContent = await fs.readFile(rolesPath, 'utf8');
            const roles = JSON.parse(fileContent);

            return roles.filter(role => role.creatorId === userId);
        } catch (error) {
            console.error('Error getting user roles:', error);
            return [];
        }
    }

    static async clearUserRoles(userId) {
        try {
            const rolesPath = path.join(__dirname, '..', 'data', 'roles.json');
            const fileContent = await fs.readFile(rolesPath, 'utf8');
            let roles = JSON.parse(fileContent);

            roles = roles.filter(role => role.creatorId !== userId);

            await fs.writeFile(rolesPath, JSON.stringify(roles, null, 2));

            await Logger.log('ROLE', {
                type: 'ROLES_CLEARED',
                userId,
                timestamp: moment().tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
            });

            return true;
        } catch (error) {
            console.error('Error clearing user roles:', error);
            return false;
        }
    }

    // Validation methods
    static isValidRoleName(name) {
        return name.length >= 2 && name.length <= config.ROLE_LIMITS.MAX_NAME_LENGTH;
    }

    static isValidHexColor(color) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
    }

    static async isValidImageUrl(url) {
        try {
            const response = await fetch(url);
            const contentType = response.headers.get('content-type');
            const contentLength = response.headers.get('content-length');

            return (
                contentType.startsWith('image/') &&
                parseInt(contentLength) <= config.ROLE_LIMITS.MAX_ICON_SIZE
            );
        } catch {
            return false;
        }
    }
}

module.exports = RoleManager;