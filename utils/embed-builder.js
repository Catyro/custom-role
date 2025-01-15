const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const moment = require('moment-timezone');

class EmbedService {
    /**
     * Membuat embed message dengan format standar
     * @param {Object} options - Opsi untuk membuat embed
     * @param {string} options.title - Judul embed
     * @param {string} options.description - Deskripsi embed
     * @param {Array} options.fields - Array of fields untuk embed
     * @param {string} options.color - Warna embed (hex)
     * @param {Object} options.thumbnail - Thumbnail untuk embed
     * @param {Object} options.image - Image untuk embed
     * @param {Object} options.author - Author untuk embed
     * @param {Object} options.footer - Footer untuk embed
     * @param {boolean} options.timestamp - Menambahkan timestamp atau tidak
     * @returns {EmbedBuilder} Discord embed message
     */
    static createEmbed(options) {
        const embed = new EmbedBuilder();

        if (options.title) embed.setTitle(options.title);
        if (options.description) embed.setDescription(options.description);
        if (options.fields) embed.addFields(options.fields);
        if (options.color) embed.setColor(options.color);
        if (options.thumbnail) embed.setThumbnail(options.thumbnail);
        if (options.image) embed.setImage(options.image);
        if (options.author) embed.setAuthor(options.author);
        if (options.footer) embed.setFooter(options.footer);
        if (options.timestamp) embed.setTimestamp();

        return embed;
    }

    /**
     * Membuat embed untuk success message
     * @param {string} description - Pesan sukses
     * @returns {EmbedBuilder} Success embed
     */
    static successEmbed(description) {
        return this.createEmbed({
            description: `${config.EMOJIS.SUCCESS} ${description}`,
            color: config.EMBED_COLORS.SUCCESS,
            timestamp: true
        });
    }

    /**
     * Membuat embed untuk error message
     * @param {string} description - Pesan error
     * @returns {EmbedBuilder} Error embed
     */
    static errorEmbed(description) {
        return this.createEmbed({
            description: `${config.EMOJIS.ERROR} ${description}`,
            color: config.EMBED_COLORS.ERROR,
            timestamp: true
        });
    }

    /**
     * Membuat embed untuk warning message
     * @param {string} description - Pesan warning
     * @returns {EmbedBuilder} Warning embed
     */
    static warningEmbed(description) {
        return this.createEmbed({
            description: `${config.EMOJIS.WARNING} ${description}`,
            color: config.EMBED_COLORS.WARNING,
            timestamp: true
        });
    }

    /**
     * Membuat embed untuk role info
     * @param {Object} role - Role object
     * @param {Object} member - Member object
     * @returns {EmbedBuilder} Role info embed
     */
    static roleInfoEmbed(role, member) {
        return this.createEmbed({
            title: `${config.EMOJIS.ROLE} Informasi Role`,
            fields: [
                {
                    name: 'Nama',
                    value: role.name,
                    inline: true
                },
                {
                    name: 'Warna',
                    value: role.hexColor,
                    inline: true
                },
                {
                    name: 'Dibuat Pada',
                    value: moment(role.createdAt).tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm:ss'),
                    inline: true
                },
                {
                    name: 'Dimiliki Oleh',
                    value: `<@${member.id}>`,
                    inline: true
                }
            ],
            thumbnail: member.user.displayAvatarURL({ dynamic: true }),
            color: role.color || config.EMBED_COLORS.PRIMARY,
            timestamp: true
        });
    }

    /**
     * Membuat embed untuk boost notification
     * @param {Object} member - Member yang boost
     * @param {Object} role - Role yang dibuat
     * @returns {EmbedBuilder} Boost notification embed
     */
    static boostNotificationEmbed(member, role) {
        return this.createEmbed({
            title: `${config.EMOJIS.BOOST} Terima Kasih Telah Boost!`,
            description: 'Sebagai hadiah, kamu mendapatkan custom role!\nGunakan command `/edit-role` untuk mengustomisasi role kamu.',
            fields: [
                {
                    name: 'Role Kamu',
                    value: role.toString(),
                    inline: true
                },
                {
                    name: 'Cara Menggunakan',
                    value: '`/edit-role` - Mengubah nama dan warna role\n`/settings` - Melihat pengaturan role',
                    inline: false
                }
            ],
            thumbnail: member.user.displayAvatarURL({ dynamic: true }),
            color: config.EMBED_COLORS.BOOST,
            timestamp: true
        });
    }
}

module.exports = EmbedService;