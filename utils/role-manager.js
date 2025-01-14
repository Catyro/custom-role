const fs = require('fs');
const path = require('path');

class RoleManager {
    static db = new Map();
    static dataPath = path.join(__dirname, '../data/roles.json');

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
                fs.writeFileSync(this.dataPath, JSON.stringify({}));
            }

            console.log('RoleManager initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing RoleManager:', error);
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

    static async createCustomRole(guildId, creatorId, targetId, roleInfo) {
        try {
            const key = `roles_${guildId}`;
            const roles = this.db.get(key) || [];
            roles.push({
                ...roleInfo,
                creatorId,
                targetId,
                createdAt: new Date().toISOString()
            });
            this.db.set(key, roles);
            await this.saveData();
            return true;
        } catch (error) {
            console.error('Error creating custom role:', error);
            return false;
        }
    }

    static async getTempRoleData(userId) {
        return this.db.get(`temp_role_${userId}`);
    }

    static async setTempRoleData(userId, data) {
        this.db.set(`temp_role_${userId}`, data);
        await this.saveData();
    }

    static async clearTempRoleData(userId) {
        this.db.delete(`temp_role_${userId}`);
        await this.saveData();
    }

    static async isInTestMode(userId) {
        return this.db.get(`test_mode_${userId}`) || false;
    }

    static async setTestMode(userId, isEnabled) {
        this.db.set(`test_mode_${userId}`, isEnabled);
        await this.saveData();
    }

    static async setTestRole(userId, roleInfo) {
        this.db.set(`test_role_${userId}`, roleInfo);
        await this.saveData();
    }

    static async getTestRole(userId) {
        return this.db.get(`test_role_${userId}`);
    }

    static async deleteRole(guildId, roleId) {
        try {
            const key = `roles_${guildId}`;
            const roles = this.db.get(key) || [];
            const updatedRoles = roles.filter(role => role.id !== roleId);
            this.db.set(key, updatedRoles);
            await this.saveData();
            return true;
        } catch (error) {
            console.error('Error deleting role:', error);
            return false;
        }
    }

    static async getRoleInfo(guildId, roleId) {
        try {
            const roles = this.db.get(`roles_${guildId}`) || [];
            return roles.find(role => role.id === roleId);
        } catch (error) {
            console.error('Error getting role info:', error);
            return null;
        }
    }

    static async updateRole(guildId, roleId, updates) {
        try {
            const key = `roles_${guildId}`;
            const roles = this.db.get(key) || [];
            const roleIndex = roles.findIndex(role => role.id === roleId);
            
            if (roleIndex === -1) return false;
            
            roles[roleIndex] = { ...roles[roleIndex], ...updates };
            this.db.set(key, roles);
            await this.saveData();
            return true;
        } catch (error) {
            console.error('Error updating role:', error);
            return false;
        }
    }
}

module.exports = RoleManager;