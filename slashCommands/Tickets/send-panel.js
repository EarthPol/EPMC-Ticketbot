// slashCommands/send-panel.js
const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('send-panel')
        .setDescription('Send ticket panel to specific channel!')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Text channel to post the ticket panel in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),

    async execute(client, interaction) {
        const channel = interaction.options.getChannel('channel');

        const { MessageActionRow, MessageButton, MessageEmbed } = require('discord.js');
        const row = new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId('general_ticket')
                .setLabel('General Ticket')
                .setStyle('SECONDARY'),
            new MessageButton()
                .setCustomId('report_player')
                .setLabel('Report a Player')
                .setStyle('SECONDARY'),
            new MessageButton()
                .setCustomId('bug_report')
                .setLabel('Bug Reports')
                .setStyle('SECONDARY'),
            new MessageButton()
                .setCustomId('report_staff')
                .setLabel('Report Staff Abuse')
                .setStyle('SECONDARY'),
        );

        const embed = new MessageEmbed()
            .setTitle('Create ticket')
            .setDescription('Click one of the buttons below to open a ticket')
            .setColor(client.config.embedColor)
            .setFooter({
                text: client.config.embedfooterText,
                iconURL: client.user.displayAvatarURL()
            });

        await channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({
            content: `✅ Ticket panel sent to ${channel}`,
            ephemeral: true
        });
    }
};
