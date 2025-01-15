const { EmbedBuilder } = require('discord.js');
const moment = require('moment-timezone');

/**
 * Custom embed builder yang memperluas EmbedBuilder dari discord.js
 * dengan menambahkan metode untuk gaya-gaya yang umum digunakan
 */
class CustomEmbedBuilder extends EmbedBuilder {
    constructor(data = {}) {
        super(data);
        this.setTimestamp()
            .setFooter({
                text: `${moment().tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss')} • ${data.footer || 'Custom Role Bot'}`
            });
    }

    /**
     * Set success style untuk embed
     * @param {string} title - Judul embed
     * @param {string} description - Deskripsi embed
     * @returns {CustomEmbedBuilder}
     */
    setSuccess(title, description) {
        return this
            .setColor(0x00ff00)
            .setTitle(`✅ ${title}`)
            .setDescription(description);
    }

    /**
     * Set error style untuk embed
     * @param {string} title - Judul embed
     * @param {string} description - Deskripsi embed
     * @returns {CustomEmbedBuilder}
     */
    setError(title, description) {
        return this
            .setColor(0xff0000)
            .setTitle(`❌ ${title}`)
            .setDescription(description);
    }

    /**
     * Set warning style untuk embed
     * @param {string} title - Judul embed
     * @param {string} description - Deskripsi embed
     * @returns {CustomEmbedBuilder}
     */
    setWarning(title, description) {
        return this
            .setColor(0xffa500)
            .setTitle(`⚠️ ${title}`)
            .setDescription(description);
    }

    /**
     * Set info style untuk embed
     * @param {string} title - Judul embed
     * @param {string} description - Deskripsi embed
     * @returns {CustomEmbedBuilder}
     */
    setInfo(title, description) {
        return this
            .setColor(0x007bff)
            .setTitle(`ℹ️ ${title}`)
            .setDescription(description);
    }

    /**
     * Set loading style untuk embed
     * @param {string} title - Judul embed
     * @param {string} description - Deskripsi embed
     * @returns {CustomEmbedBuilder}
     */
    setLoading(title, description) {
        return this
            .setColor(0x7289da)
            .setTitle(`⏳ ${title}`)
            .setDescription(description);
    }

    /**
     * Set custom style untuk embed
     * @param {string} emoji - Emoji untuk judul
     * @param {string} title - Judul embed
     * @param {string} description - Deskripsi embed
     * @param {number} color - Warna embed dalam format hex
     * @returns {CustomEmbedBuilder}
     */
    setCustom(emoji, title, description, color) {
        return this
            .setColor(color)
            .setTitle(`${emoji} ${title}`)
            .setDescription(description);
    }

    /**
     * Set role info style untuk embed
     * @param {Role} role - Role Discord yang akan ditampilkan
     * @param {string} action - Aksi yang dilakukan pada role
     * @returns {CustomEmbedBuilder}
     */
    setRoleInfo(role, action) {
        return this
            .setColor(role.color)
            .setTitle(`👑 ${action}`)
            .addFields(
                { name: 'Nama Role', value: role.name, inline: true },
                { name: 'Warna', value: role.hexColor, inline: true },
                { name: 'ID', value: role.id, inline: true },
                { name: 'Posisi', value: `${role.position}`, inline: true },
                { name: 'Mentionable', value: role.mentionable ? 'Ya' : 'Tidak', inline: true },
                { name: 'Hoisted', value: role.hoist ? 'Ya' : 'Tidak', inline: true }
            );
    }

    /**
     * Set user info style untuk embed
     * @param {User} user - User Discord yang akan ditampilkan
     * @returns {CustomEmbedBuilder}
     */
    setUserInfo(user) {
        return this
            .setColor(0x2f3136)
            .setTitle(`👤 Informasi User`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Username', value: user.tag, inline: true },
                { name: 'ID', value: user.id, inline: true },
                { name: 'Bot', value: user.bot ? 'Ya' : 'Tidak', inline: true },
                { name: 'Akun Dibuat', value: moment(user.createdAt).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss'), inline: true }
            );
    }

    /**
     * Set bot info style untuk embed
     * @param {Client} client - Client Discord.js
     * @returns {CustomEmbedBuilder}
     */
    setBotInfo(client) {
        const botUptime = moment.duration(client.uptime);
        return this
            .setColor(0x2f3136)
            .setTitle(`🤖 Informasi Bot`)
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: 'Nama Bot', value: client.user.tag, inline: true },
                { name: 'ID', value: client.user.id, inline: true },
                { name: 'Uptime', value: `${botUptime.days()}d ${botUptime.hours()}h ${botUptime.minutes()}m`, inline: true },
                { name: 'Server', value: `${client.guilds.cache.size}`, inline: true },
                { name: 'Users', value: `${client.users.cache.size}`, inline: true },
                { name: 'Commands', value: `${client.commands?.size || 0}`, inline: true },
                { name: 'Developer', value: 'Catyro', inline: true },
                { name: 'Node.js', value: process.version, inline: true },
                { name: 'Discord.js', value: require('discord.js').version, inline: true }
            );
    }

    /**
     * Set custom footer untuk embed
     * @param {string} text - Teks footer
     * @param {string} iconURL - URL ikon untuk footer (opsional)
     * @returns {CustomEmbedBuilder}
     */
    setCustomFooter(text, iconURL) {
        return this.setFooter({
            text: `${moment().tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss')} • ${text}`,
            iconURL: iconURL
        });
    }
}

module.exports = CustomEmbedBuilder;