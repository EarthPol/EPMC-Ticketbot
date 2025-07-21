const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription("Check the bot's ping!"),

    async run(client, interaction) {
        // send a provisional reply to measure latency
        const sent = await interaction.reply({ content: '🏓 Pinging…', fetchReply: true });
        const time = sent.createdTimestamp - interaction.createdTimestamp;

        const embed = new EmbedBuilder()
            .setTitle('📶 Bot Ping')
            .addFields(
                { name: 'Time',     value: `${time}ms`,           inline: true },
                { name: 'API Ping', value: `${client.ws.ping}ms`, inline: true }
            )
            .setColor(client.config.embedColor)
            .setFooter({
                text: client.config.embedfooterText,
                iconURL: client.user.displayAvatarURL()
            });

        return interaction.editReply({ content: null, embeds: [embed] });
    }
};
