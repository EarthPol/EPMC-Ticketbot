const sourcebin = require('sourcebin_js');
const fs   = require('fs');
const path = require('path');

module.exports = {
    name: 'interactionCreate',

    /**
     * @param {ButtonInteraction} interaction 
     * @param {Client} client 
     */
    async execute(interaction, client) {
        if (!interaction.isButton()) return;

        if (interaction.customId === 'ticket-delete' && interaction.channel.name.includes('close')) {
            const channel = interaction.channel;
            // extract the same number from the “close-<number>” name
            const numMatch = channel.name.match(/^close\-(\d+)$/);
            const ticketNumber = numMatch ? numMatch[1] : 'unknown';
            const member = interaction.guild.members.cache.get(channel.topic);

            // ─── dump transcript locally & DM to opener ───────────────────
            try {
                // grab last 100 msgs
                const fetched = await channel.messages.fetch({limit: 100});
                const lines = Array.from(fetched.values())
                    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
                    .map(m => `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author.tag}: ${m.content}`);

                // ensure folder exists
                const histDir = path.join(__dirname, '..', 'ticket-history');
                fs.mkdirSync(histDir, {recursive: true});

                // write text file
                const transcriptPath = path.join(histDir, `ticket-${ticketNumber}.txt`);
                fs.writeFileSync(transcriptPath, lines.join('\n'), 'utf8');

                // DM it
                try {
                    const opener = await client.users.fetch(member.user.id);
                    await opener.send({
                        content: `Here’s your transcript for ticket #${ticketNumber}`,
                        files: [transcriptPath]
                    });
                } catch (err) {
                    console.error('Failed to DM transcript', err);
                }
            } catch (err) {
                console.error('Failed to save local transcript', err);
            }


            const transcriptsChannel = client.channels.cache.get(client.config.ticketsTranscripts);

            const rowCloseFalse = new client.discord.MessageActionRow()
            .addComponents(
                new client.discord.MessageButton()
                .setStyle("DANGER")
                .setEmoji("🗑️")
                .setDisabled(true)
                .setCustomId("ticket-delete")
            );
            
            interaction.message.edit({ components: [rowCloseFalse] });

            interaction.deferUpdate();

            let msg = await channel.send({ content: 'Saving transcript...' });
            channel.messages.fetch().then(async (messages) => {
                const content = messages.reverse().map(m => `${new Date(m.createdAt).toLocaleString('en-US')} - ${m.author.tag}: ${m.attachments.size > 0 ? m.attachments.first().proxyURL : m.content}`).join('\n');

                let transcript = await sourcebin.create([{ name: `${channel.name}`, content: content, languageId: 'text' }], {
                    title: `Chat transcript: ${channel.name}`,
                    description: ' ',
                });
        
                const row = new client.discord.MessageActionRow()
                .addComponents(
                    new client.discord.MessageButton()
                    .setStyle("LINK")
                    .setEmoji("📑")
                    .setURL(`${transcript.url}`)
                );
        
                const embed = new client.discord.MessageEmbed()
                .setTitle("Ticket Transcript")
                .addFields(
                    { name: "Channel", value: `${interaction.channel.name}` },
                    { name: "Ticket Owner", value: `<@!${member.id}>` },
                    { name: "Direct Transcript", value: `[Direct Transcript](${transcript.url})` }
                )
                .setColor(client.config.embedColor)
                .setFooter({ text: `${client.config.embedfooterText}`, iconURL: `${client.user.displayAvatarURL()}` });
        
                await transcriptsChannel.send({ embeds: [embed], components: [row] });
            });

            await msg.edit({ content: `Transcript saved to <#${transcriptsChannel.id}>` });

            await channel.send({ content: 'Ticket will be deleted in 5 seconds!' });

            setTimeout(async function () {
                channel.delete();
            }, 5000);
        }
    }
}