const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

class RoleManager {
    static db = new Map();
    static dataPath = path.join(__dirname, '../data/roles.json');
    static activeMessages = new Collection(); // Untuk tracking pesan aktif
    static cooldowns = new Map(); // Untuk mengelola cooldown

    static async init() {
        try {
            // Buat direktori data jika belum ada
            const dataDir = path.dirname(this.dataPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Load data dari file jika ada
            if (fs.existsSync(this.dataPath)) {
                const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
                Object.entries(data).forEach(([key, value]) => {
                    this.db.set(key, value);
                });
            } else {
                // Buat file baru jika belum ada
                await this.saveData();
            }

            // Bersihkan data temporary setiap startup
            this.cleanupTempData();

            console.log('✅ RoleManager initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Error initializing RoleManager:', error);
            return false;
        }
    }

    static async saveData() {
        try {
            const data = Object.fromEntries(this.db);
            await fs.promises.writeFile(this.dataPath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving role data:', error);
            return false;
        }
    }

    static async getAllCustomRoles(guildId) {
        try {
            return this.db.get(`roles_${guildId}`) || [];
        } catch (error) {
            console.error('Error getting custom roles:', error);
            return [];
        }
    }

    static async getUserRoles(guildId, userId) {
        try {
            const roles = await this.getAllCustomRoles(guildId);
            return roles.filter(role => role.creatorId === userId || role.targetId === userId);
        } catch (error) {
            console.error('Error getting user roles:', error);
            return [];
        }
    }

    static async createCustomRole(guildId, creatorId, targetId, roleInfo) {
        try {
            const key = `roles_${guildId}`;
            const roles = this.db.get(key) || [];
            
            // Validate role limit
            const creatorRoles = roles.filter(r => r.creatorId === creatorId);
            if (creatorRoles.length >= 3) { // Maximum 3 roles per user
                throw new Error('Anda telah mencapai batas maksimum pembuatan custom role (3)');
            }

            const newRole = {
                ...roleInfo,
                creatorId,
                targetId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            roles.push(newRole);
            this.db.set(key, roles);
            await this.saveData();
            return true;
        } catch (error) {
            console.error('Error creating custom role:', error);
            throw error; // Re-throw untuk penanganan error di level atas
        }
    }

    static async setActiveMessage(userId, messageId) {
        this.activeMessages.set(userId, messageId);
    }

    static async getActiveMessage(userId) {
        return this.activeMessages.get(userId);
    }

    static async clearActiveMessage(userId) {
        this.activeMessages.delete(userId);
    }

    static async getTempRoleData(userId) {
        return this.db.get(`temp_role_${userId}`);
    }

    static async setTempRoleData(userId, data) {
        this.db.set(`temp_role_${userId}`, {
            ...data,
            timestamp: new Date().toISOString()
        });
        await this.saveData();
    }

    static async clearTempRoleData(userId) {
        this.db.delete(`temp_role_${userId}`);
        await this.saveData();
    }

    static async isInTestMode(userId) {
        const testMode = this.db.get(`test_mode_${userId}`);
        if (!testMode) return false;
        
        // Auto disable test mode after 5 minutes
        if (Date.now() - new Date(testMode.timestamp).getTime() > 300000) {
            await this.setTestMode(userId, false);
            return false;
        }
        return true;
    }

    static async setTestMode(userId, isEnabled) {
        if (isEnabled) {
            this.db.set(`test_mode_${userId}`, {
                enabled: true,
                timestamp: new Date().toISOString()
            });
        } else {
            this.db.delete(`test_mode_${userId}`);
        }
        await this.saveData();
    }

    static async deleteRole(guildId, roleId) {
        try {
            const key = `roles_${guildId}`;
            const roles = this.db.get(key) || [];
            const updatedRoles = roles.filter(role => role.id !== roleId);
            
            if (roles.length === updatedRoles.length) {
                return false; // Role tidak ditemukan
            }

            this.db.set(key, updatedRoles);
            await this.saveData();
            return true;
        } catch (error) {
            console.error('Error deleting role:', error);
            return false;
        }
    }

    static async updateRole(guildId, roleId, updates) {
        try {
            const key = `roles_${guildId}`;
            const roles = this.db.get(key) || [];
            const roleIndex = roles.findIndex(role => role.id === roleId);
            
            if (roleIndex === -1) return false;
            
            roles[roleIndex] = {
                ...roles[roleIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            this.db.set(key, roles);
            await this.saveData();
            return true;
        } catch (error) {
            console.error('Error updating role:', error);
            return false;
        }
    }

    static cleanupTempData() {
        const now = Date.now();
        for (const [key, value] of this.db.entries()) {
            // Cleanup temp data older than 5 minutes
            if (key.startsWith('temp_role_') || key.startsWith('test_mode_')) {
                const timestamp = new Date(value.timestamp).getTime();
                if (now - timestamp > 300000) {
                    this.db.delete(key);
                }
            }
        }
        this.saveData();
    }

    // Method untuk mengecek cooldown
    static checkCooldown(userId, action) {
        const cooldowns = this.cooldowns;
        if (!cooldowns.has(action)) {
            cooldowns.set(action, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(action);
        const cooldownAmount = {
            'create-role': 300000, // 5 minutes
            'edit-role': 60000,    // 1 minute
            'delete-role': 60000   // 1 minute
        }[action] || 3000;         // default 3 seconds

        if (timestamps.has(userId)) {
            const expirationTime = timestamps.get(userId) + cooldownAmount;
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                return Math.round(timeLeft);
            }
        }

        timestamps.set(userId, now);
        setTimeout(() => timestamps.delete(userId), cooldownAmount);
        return 0;
    }
}

module.exports = RoleManager;
