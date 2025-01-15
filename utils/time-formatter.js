const moment = require('moment-timezone');

class TimeFormatter {
    static formatToJakarta(timestamp) {
        const jakartaTime = moment(timestamp).tz('Asia/Jakarta');
        return {
            full: jakartaTime.format('DD-MM-YYYY | [Today at] HH:mm [(WIB)]'),
            date: jakartaTime.format('DD-MM-YYYY'),
            time: jakartaTime.format('HH:mm'),
            relative: jakartaTime.fromNow()
        };
    }

    static formatDuration(milliseconds) {
        const duration = moment.duration(milliseconds);
        
        if (duration.asSeconds() < 60) {
            return `${Math.floor(duration.asSeconds())} detik`;
        } else if (duration.asMinutes() < 60) {
            return `${Math.floor(duration.asMinutes())} menit`;
        } else {
            return `${Math.floor(duration.asHours())} jam`;
        }
    }

    static getRemainingTime(endTime) {
        const now = moment();
        const end = moment(endTime);
        const duration = moment.duration(end.diff(now));

        if (duration.asSeconds() <= 0) {
            return 'Waktu habis';
        }

        if (duration.asMinutes() < 1) {
            return `${Math.ceil(duration.asSeconds())} detik tersisa`;
        } else if (duration.asHours() < 1) {
            return `${Math.ceil(duration.asMinutes())} menit tersisa`;
        } else {
            return `${Math.ceil(duration.asHours())} jam tersisa`;
        }
    }
}

module.exports = TimeFormatter;