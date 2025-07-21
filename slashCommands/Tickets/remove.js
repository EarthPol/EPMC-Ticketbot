// slashCommands/Tickets/remove.js
const { SlashCommandBuilder } = require('discord.js');
const { commandSupportRoles } = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a user or role from the ticket')
        .addUserOption(opt =>
            opt
                .setName('user')
                .setDescription('User to remove')
                .setRequired(false)
        )
        .addRoleOption(opt =>
            opt
                .setName('role')
                .setDescription('Role to remove')
                .setRequired(false)
        ),

    category: 'Tickets',
    userPerms: ['SEND_MESSAGES'],
    ownerOnly: false,

    async run(client, interaction) {
        // 1) support-role check
        if (!interaction.member.roles.cache.some(r => commandSupportRoles.includes(r.id))) {
            return interaction.reply({ content: '❌ You don’t have permission to use this.', ephemeral: true });
        }

        // 2) must be a ticket channel
        if (!/^(ticket|close)-\d+$/.test(interaction.channel.name)) {
            return interaction.reply({ content: 'This command only works inside ticket channels.', ephemeral: true });
        }

        // 3) pull target
        const user = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');
        if ((!user && !role) || (user && role)) {
            return interaction.reply({
                content: '❌ You must specify **either** a user **or** a role, not both.',
                ephemeral: true
            });
        }

        const targetId = user ? user.id : role.id;
        const mention  = user ? `<@${user.id}>` : `<@&${role.id}>`;

        // 4) apply overwrites using v14 camelCase permissions
        await interaction.channel.permissionOverwrites.edit(targetId, {
            ViewChannel: false,
            SendMessages: false,
            ReadMessageHistory: false,
            AttachFiles: false,
            EmbedLinks: false
        });

        return interaction.reply({ content: `${mention} was removed from the ticket by <@${interaction.user.id}>.`, ephemeral: false });
    }
};
