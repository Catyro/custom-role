const { EmbedBuilder } = require('discord.js');
const config = require('../config');

const Colors = {
    SUCCESS: '#00FF00',
    ERROR: '#FF0000',
    INFO: '#0099FF',
    WARNING: '#FFD700'
};

class EmbedService {
    static success(title, description) {
        return new EmbedBuilder()
            .setColor(Colors.SUCCESS)
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();
    }

    static error(title, description) {
        return new EmbedBuilder()
            .setColor(Colors.ERROR)
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();
    }

    static info(title, description) {
        return new EmbedBuilder()
            .setColor(Colors.INFO)
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();
    }

    static warning(title, description) {
        return new EmbedBuilder()
            .setColor(Colors.WARNING)
            .setTitle(title)
            .setDescription(description)
            .setTimestamp();
    }

    static customRole(boostCount, opportunities) {
        return new EmbedBuilder()
            .setColor(Colors.INFO)
            .setTitle('Terimakasih sudah boost server kami!')
            .setDescription(`Kamu mempunyai ${opportunities} Kesempatan Custom role`)
            .setTimestamp();
    }
}

module.exports = EmbedService;