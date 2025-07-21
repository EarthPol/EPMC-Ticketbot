// events/tickets/deleteTicket.js
const fs   = require('fs');
const path = require('path');

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

        // Handle the delete ticket button
        if (interaction.customId === 'ticket-delete' && interaction.channel.name.startsWith('closed-')) {
            const channel = interaction.channel;
            const match = channel.name.match(/^closed-(\d+)$/);
            const ticketNumber = match ? match[1] : 'unknown';
            const memberId = channel.topic;
            const member = interaction.guild.members.cache.get(memberId);

            // Disable delete button
            const disabledDelete = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket-delete')
                    .setLabel('Delete Ticket')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️')
                    .setDisabled(true)
            );
            await interaction.update({ components: [disabledDelete] });

            // Acknowledge transcript saving
            const confirmation = await channel.send('Saving transcript...');

            // Fetch messages up to delete click timestamp
            const fetched = await channel.messages.fetch({ limit: 100 });
            const filtered = fetched.filter(msg => msg.createdTimestamp < interaction.createdTimestamp);
            const lines = Array.from(filtered.values())
                .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
                .map(m => `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author.tag}: ${m.content}`);

            // Save transcript
            const histDir = path.join(__dirname, '..', 'ticket-history');
            fs.mkdirSync(histDir, { recursive: true });
            const transcriptPath = path.join(histDir, `ticket-${ticketNumber}.txt`);
            fs.writeFileSync(transcriptPath, lines.join('\n'), 'utf8');

            // DM transcript to opener
            if (member) {
                try {
                    const opener = await client.users.fetch(memberId);
                    await opener.send({
                        content: `Here’s your transcript for ticket #${ticketNumber}`,
                        files: [transcriptPath]
                    });
                } catch (e) {
                    console.error('Failed to DM transcript', e);
                }
            }

            // Post to transcripts channel
            const transcriptsChannel = client.channels.cache.get(client.config.ticketsTranscripts);
            if (transcriptsChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('📄 Ticket Transcript')
                    .addFields(
                        { name: 'Channel',      value: channel.name, inline: true },
                        { name: 'Ticket Owner', value: `<@${memberId}>`, inline: true },
                        { name: 'Transcript',   value: `[Download](attachment://ticket-${ticketNumber}.txt)` }
                    )
                    .setColor(client.config.embedColor)
                    .setFooter({ text: client.config.embedfooterText, iconURL: client.user.displayAvatarURL() });

                await transcriptsChannel.send({
                    embeds: [embed],
                    files: [{ attachment: transcriptPath, name: `ticket-${ticketNumber}.txt` }]
                });
            }

            // Notify and delete
            await confirmation.edit('Transcript saved. Deleting ticket in 5 seconds...');
            setTimeout(() => channel.delete(), 5000);
        }
    }
};