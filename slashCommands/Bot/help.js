const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { readdirSync } = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Return all commands, or one specific command!')
        .addStringOption(opt =>
            opt
                .setName('command')
                .setDescription('What command do you need help with?')
                .setRequired(false)
        ),

    category: 'Bot',
    userPerms: ['SEND_MESSAGES'],
    ownerOnly: false,

    async run(client, interaction) {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('GitHub')
                .setStyle(ButtonStyle.Link)
                .setURL('https://github.com/EarthPol/EPMC-Ticketbot'),
            new ButtonBuilder()
                .setLabel('Support')
                .setStyle(ButtonStyle.Link)
                .setURL('https://discord.gg/9BDaASVSQ6')
        );

        const commandName = interaction.options.getString('command');
        if (!commandName) {
            // list all slash commands by folder
            const list = (folder) =>
                readdirSync(`./slashCommands/${folder}`)
                    .map(f => {
                        const cmd = require(`../../slashCommands/${folder}/${f}`);
                        return `\`${cmd.data.name}\``;
                    })
                    .join(', ') || 'None';

            const helpEmbed = new EmbedBuilder()
                .setTitle(`${client.user.username} SlashHelp`)
                .setDescription(
                    `Hello <@${interaction.member.id}>, I am <@${client.user.id}>.\n` +
                    `Use \`/help <command>\` for details.\n` +
                    `**Total SlashCommands:** ${client.slash.size}`
                )
                .addFields(
                    { name: '🤖 Bot',     value: list('Bot'),     inline: true },
                    { name: '🛠 Utility', value: list('Utility'), inline: true },
                    { name: '📩 Tickets', value: list('Tickets'), inline: true }
                )
                .setColor(client.config.embedColor)
                .setFooter({
                    text: client.config.embedfooterText,
                    iconURL: client.user.displayAvatarURL()
                });

            return interaction.reply({ embeds: [helpEmbed], components: [row] });
        }

        // specific command help
        const cmd = client.slash.get(commandName.toLowerCase());
        if (!cmd) {
            return interaction.reply({
                content: `There isn't any SlashCommand named "${commandName}"`,
                ephemeral: true
            });
        }

        const infoEmbed = new EmbedBuilder()
            .setTitle(`Help: \`${cmd.data.name}\``)
            .addFields(
                { name: 'Description', value: cmd.data.description, inline: false },
                { name: 'Category',    value: cmd.category   || 'None',        inline: false },
                { name: 'Usage',       value: cmd.usage      || 'None',        inline: false }
            )
            .setColor(client.config.embedColor)
            .setFooter({
                text: client.config.embedfooterText,
                iconURL: client.user.displayAvatarURL()
            });

        return interaction.reply({ embeds: [infoEmbed], ephemeral: true });
    }
};
