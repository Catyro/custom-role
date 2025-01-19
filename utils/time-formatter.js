const moment = require('moment-timezone');

class TimeFormatter {
    /**
     * Gets the current timestamp in YYYY-MM-DD HH:mm:ss format
     * @returns {string} Formatted timestamp
     */
    static getCurrentTimestamp() {
        const date = new Date();
        return date.toLocaleString('en-US', {
            timeZone: 'Asia/Jakarta',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3-$1-$2 $4:$5:$6');
    }

    /**
     * Formats a date to YYYY-MM-DD HH:mm:ss
     * @param {Date} date - Date to format
     * @returns {string} Formatted date
     */
    static formatDate(date) {
        return date.toLocaleString('en-US', {
            timeZone: 'Asia/Jakarta',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, '$3-$1-$2 $4:$5:$6');
    }

    /**
     * Formats duration in milliseconds to readable string
     * @param {number} ms - Duration in milliseconds
     * @returns {string} Formatted duration
     */
    static formatDuration(ms) {
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));

        const parts = [];
        if (days > 0) parts.push(`${days} hari`);
        if (hours > 0) parts.push(`${hours} jam`);
        if (minutes > 0) parts.push(`${minutes} menit`);
        if (seconds > 0) parts.push(`${seconds} detik`);

        return parts.join(', ') || '0 detik';
    }

    /**
     * Converts a timestamp string to Date object
     * @param {string} timestamp - Timestamp string in YYYY-MM-DD HH:mm:ss format
     * @returns {Date} Date object
     */
    static parseTimestamp(timestamp) {
        const [date, time] = timestamp.split(' ');
        const [year, month, day] = date.split('-');
        const [hours, minutes, seconds] = time.split(':');
        
        return new Date(year, month - 1, day, hours, minutes, seconds);
    }

    /**
     * Gets relative time string (e.g., "2 hours ago")
     * @param {string} timestamp - Timestamp to compare
     * @returns {string} Relative time string
     */
    static getRelativeTime(timestamp) {
        const date = this.parseTimestamp(timestamp);
        const now = new Date();
        const diff = now - date;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (days > 0) return `${days} hari yang lalu`;
        if (hours > 0) return `${hours} jam yang lalu`;
        if (minutes > 0) return `${minutes} menit yang lalu`;
        return 'Baru saja';
    }
}

module.exports = TimeFormatter;
