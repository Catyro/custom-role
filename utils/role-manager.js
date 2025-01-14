const fs = require('fs-extra'); // Menggunakan fs-extra untuk fitur tambahan
const path = require('path');
const { Collection } = require('discord.js');
const Logger = require('./logger');

class RoleManager {
    static db = new Map();
    static dataPath = path.join(__dirname, '../data/roles.json');
    static activeMessages = new Collection();
    static cooldowns = new Map();
    static ROLE_LIMITS = {
        MAX_ROLES_PER_USER: 3,
        MAX_NAME_LENGTH: 100,
        MAX_ROLES_PER_GUILD: 250
    };
    static COOLDOWNS = {
        'create-role': 300000, // 5 minutes
        'edit-role': 60000,    // 1 minute
        'delete-role': 60000,  // 1 minute
        'default': 3000        // 3 seconds
    };

    static async init() {
        try {
            await fs.ensureDir(path.dirname(this.dataPath));
            
            if (await fs.pathExists(this.dataPath)) {
                const data = await fs.readJson(this.dataPath);
                Object.entries(data).forEach(([key, value]) => {
                    this.db.set(key, value);
                });
            } else {
                await this.saveData();
            }

            await this.cleanupTempData();
            await Logger.log('INFO', {
                type: 'ROLE_MANAGER_INIT',
                message: 'RoleManager initialized successfully'
            });
            return true;
        } catch (error) {
            await Logger.log('ERROR', {
                type: 'ROLE_MANAGER_INIT',
                error: error.message
            });
            return false;
        }
    }

    static async saveData() {
        try {
            const data = Object.fromEntries(this.db);
            await fs.writeJson(this.dataPath, data, { spaces: 2 });
            return true;
        } catch (error) {
            await Logger.log('ERROR', {
                type: 'ROLE_MANAGER_SAVE',
                error: error.message
            });
            return false;
        }
    }

    static async createCustomRole(guildId, creatorId, targetId, roleInfo) {
        try {
            const key = `roles_${guildId}`;
            const roles = this.db.get(key) || [];
            
            // Validate role limits
            if (roles.filter(r => r.creatorId === creatorId).length >= this.ROLE_LIMITS.MAX_ROLES_PER_USER) {
                throw new Error(`Anda telah mencapai batas maksimum pembuatan custom role (${this.ROLE_LIMITS.MAX_ROLES_PER_USER})`);
            }

            if (roles.length >= this.ROLE_LIMITS.MAX_ROLES_PER_GUILD) {
                throw new Error('Server telah mencapai batas maksimum custom role');
            }

            // Validate role name
            if (!roleInfo.name || roleInfo.name.length > this.ROLE_LIMITS.MAX_NAME_LENGTH) {
                throw new Error(`Nama role harus antara 1-${this.ROLE_LIMITS.MAX_NAME_LENGTH} karakter`);
            }

            const newRole = {
                ...roleInfo,
                id: `${guildId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                creatorId,
                targetId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            roles.push(newRole);
            this.db.set(key, roles);
            await this.saveData();

            await Logger.log('INFO', {
                type: 'ROLE_CREATED',
                guildId,
                creatorId,
                roleId: newRole.id
            });

            return newRole;
        } catch (error) {
            await Logger.log('ERROR', {
                type: 'ROLE_CREATE_FAILED',
                guildId,
                creatorId,
                error: error.message
            });
            throw error;
        }
    }

    static async checkCooldown(userId, action) {
        try {
            if (!this.cooldowns.has(action)) {
                this.cooldowns.set(action, new Collection());
            }

            const now = Date.now();
            const timestamps = this.cooldowns.get(action);
            const cooldownAmount = this.COOLDOWNS[action] || this.COOLDOWNS.default;

            // Cleanup old cooldowns
            this.cleanupOldCooldowns(timestamps);

            if (timestamps.has(userId)) {
                const expirationTime = timestamps.get(userId) + cooldownAmount;
                if (now < expirationTime) {
                    return Math.round((expirationTime - now) / 1000);
                }
            }

            timestamps.set(userId, now);
            setTimeout(() => timestamps.delete(userId), cooldownAmount);
            return 0;
        } catch (error) {
            await Logger.log('ERROR', {
                type: 'COOLDOWN_CHECK_FAILED',
                userId,
                action,
                error: error.message
            });
            return 0; // Default to no cooldown on error
        }
    }

    static async cleanupTempData() {
        try {
            const now = Date.now();
            let cleanupCount = 0;

            for (const [key, value] of this.db.entries()) {
                if (key.startsWith('temp_role_') || key.startsWith('test_mode_')) {
                    const timestamp = new Date(value.timestamp).getTime();
                    if (now - timestamp > 300000) { // 5 minutes
                        this.db.delete(key);
                        cleanupCount++;
                    }
                }
            }

            if (cleanupCount > 0) {
                await this.saveData();
                await Logger.log('INFO', {
                    type: 'TEMP_DATA_CLEANUP',
                    itemsCleaned: cleanupCount
                });
            }
        } catch (error) {
            await Logger.log('ERROR', {
                type: 'CLEANUP_FAILED',
                error: error.message
            });
        }
    }

    static cleanupOldCooldowns(timestamps) {
        const now = Date.now();
        let cleaned = 0;
        timestamps.forEach((timestamp, userId) => {
            if (now - timestamp > 3600000) { // 1 hour
                timestamps.delete(userId);
                cleaned++;
            }
        });
        return cleaned;
    }

    static async getRoleStats(guildId) {
        try {
            const roles = await this.getAllCustomRoles(guildId);
            return {
                total: roles.length,
                activeUsers: new Set(roles.map(r => r.creatorId)).size,
                recentlyCreated: roles.filter(r => 
                    Date.now() - new Date(r.createdAt).getTime() < 86400000 // 24 hours
                ).length
            };
        } catch (error) {
            await Logger.log('ERROR', {
                type: 'ROLE_STATS_FAILED',
                guildId,
                error: error.message
            });
            return { total: 0, activeUsers: 0, recentlyCreated: 0 };
        }
    }
}

module.exports = RoleManager;
