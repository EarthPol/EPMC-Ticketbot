// events/tickets/closeTicket.js
const {
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ButtonStyle
} = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (!interaction.isButton()) return;

        // Close ticket button
        if (interaction.customId === 'ticket-close' && interaction.channel.name.startsWith('ticket-')) {
            const channel = interaction.channel;
            const match = channel.name.match(/^ticket-(\d+)$/);
            const ticketNumber = match ? match[1] : 'unknown';
            const memberId = channel.topic;
            const member = interaction.guild.members.cache.get(memberId);

            // Disable the close button
            const disabledClose = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket-close')
                    .setLabel('Closed')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🔒')
                    .setDisabled(true)
            );
            await interaction.message.edit({ components: [disabledClose] });

            // Prepare delete buttons
            const deleteDisabled = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket-delete')
                    .setLabel('Delete Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️')
                    .setDisabled(true)
            );
            const deleteEnabled = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket-delete')
                    .setLabel('Delete Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️')
                    .setDisabled(false)
            );

            // Acknowledge closure
            const embed = new EmbedBuilder()
                .setTitle('Close Ticket!')
                .setDescription(
                    `Ticket #${ticketNumber} closed by <@${interaction.user.id}>.\n\n` +
                    '**Press 🗑️ below to delete the ticket.**'
                )
                .setColor(client.config.embedColor)
                .setFooter({ text: client.config.embedfooterText, iconURL: client.user.displayAvatarURL() });

            await interaction.reply({ embeds: [embed], components: [deleteDisabled] });

            // Rename channel and enable delete button
            setTimeout(async () => {
                await channel.edit({ name: `closed-${ticketNumber}` });
                await interaction.editReply({ components: [deleteEnabled] });
            }, 2000);

            // Restrict original ticket opener
            if (member) {
                await channel.permissionOverwrites.edit(member, {
                    ViewChannel: false // v14 key
                });
            }
        }
    }
};
