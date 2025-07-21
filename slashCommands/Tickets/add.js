// slashCommands/Tickets/add.js
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { commandSupportRoles } = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add')
        .setDescription('Add a user or role to the ticket')
        .addUserOption(opt =>
            opt
                .setName('user')
                .setDescription('User to add')
                .setRequired(false)
        )
        .addRoleOption(opt =>
            opt
                .setName('role')
                .setDescription('Role to add')
                .setRequired(false)
        ),

    category: 'Tickets',
    userPerms: ['SEND_MESSAGES'],
    ownerOnly: false,

    async run(client, interaction) {
        // 1) Support-role check
        if (!interaction.member.roles.cache.some(r => commandSupportRoles.includes(r.id))) {
            return interaction.reply({ content: '❌ You don’t have permission to use this.', ephemeral: true });
        }

        // 2) Must be in a ticket channel
        if (!/^(ticket|close)-\d+$/.test(interaction.channel.name)) {
            return interaction.reply({ content: 'This command only works inside ticket channels.', ephemeral: true });
        }

        // 3) Pull target
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

        // 4) Apply overwrites using v14 permission flags names
        await interaction.channel.permissionOverwrites.edit(targetId, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            AttachFiles: true,
            EmbedLinks: true
        });

        return interaction.reply({
            content: `${mention} was added to the ticket by <@${interaction.user.id}>.`,
            ephemeral: false
        });
    }
};