// slashCommands/Tickets/send-panel.js
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('send-panel')
        .setDescription('Send the ticket creation panel to a channel')
        .addChannelOption(opt =>
            opt.setName('channel')
                .setDescription('Text channel to send the ticket panel to')
                .addChannelTypes(0) // 0 is GUILD_TEXT in v14
                .setRequired(true)
        ),
    category: 'Tickets',
    userPerms: ['Administrator'],
    ownerOnly: false,
    async run(client, interaction) {
        const channel = interaction.options.getChannel('channel');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('general_ticket')
                .setLabel('General Ticket')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('report_player')
                .setLabel('Report a Player')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('bug_report')
                .setLabel('Bug Report')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('report_staff')
                .setLabel('Report Staff Abuse')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('item_restoration')
                .setLabel('Restore Items')
                .setStyle(ButtonStyle.Secondary)
        );

        const embed = new EmbedBuilder()
            .setTitle('🎫 Create a Ticket')
            .setDescription('Select the type of ticket you’d like to open:')
            .setColor(client.config.embedColor)
            .setFooter({ text: client.config.embedfooterText, iconURL: client.user.displayAvatarURL() });

        await interaction.reply({ content: `Panel sent to ${channel}`, ephemeral: true });
        await channel.send({ embeds: [embed], components: [row] });
    }
};
