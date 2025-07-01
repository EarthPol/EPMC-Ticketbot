// remove.js
const { commandSupportRoles } = require('../../config.js');

module.exports = {
    name: "remove",
    description: "Remove a user or role from the ticket",
    category: "Tickets",
    userPerms: ["SEND_MESSAGES"],
    ownerOnly: false,
    options: [
        {
            name: "user",
            description: "User to remove",
            type: "USER",
            required: false
        },
        {
            name: "role",
            description: "Role to remove",
            type: "ROLE",
            required: false
        }
    ],
    run: async (client, interaction, args) => {
        // 1) support‐role check
        if (!interaction.member.roles.cache.some(r => commandSupportRoles.includes(r.id))) {
            return interaction.reply({ content: "❌ You don’t have permission to use this.", ephemeral: true });
        }

        // 2) must be a ticket channel
        if (!interaction.channel.name.match(/^(ticket|close)-\d+$/)) {
            return interaction.reply({ content: "This command only works inside ticket channels.", ephemeral: true });
        }

        // 3) pull target
        const user = interaction.options.getUser("user");
        const role = interaction.options.getRole("role");
        if ((!user && !role) || (user && role)) {
            return interaction.reply({
                content: "❌ You must specify **either** a user **or** a role, not both.",
                ephemeral: true
            });
        }

        const targetId = user ? user.id : role.id;
        const mention  = user ? `<@${user.id}>` : `<@&${role.id}>`;

        // 4) apply overwrites
        await interaction.channel.permissionOverwrites.edit(targetId, {
            VIEW_CHANNEL: false,
            SEND_MESSAGES: false,
            READ_MESSAGE_HISTORY: false,
            ATTACH_FILES: false
        });

        return interaction.reply({ content: `${mention} was removed from the ticket by ${interaction.user}.` });
    }
}
