// events/interactionCreate.js
const fs    = require('fs');
const path  = require('path');
const axios = require('axios'); // npm install axios

const {
    ticketsSupportRoles,
    ticketsOpenCategory,
    embedColor,
    embedfooterText
} = require('../../config.js');

const {
    MessageActionRow,
    MessageButton,
    MessageEmbed
} = require('discord.js');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (!interaction.isButton() || interaction.customId !== 'create-ticket') return;

        await interaction.deferReply({ ephemeral: true });

        // ─── verify EarthPol linkage ─────────────────────────────────────
        let linkedUuid, players;
        try {
            // 1) lookup by Discord ID
            const res1 = await axios.post(
                'https://api.earthpol.com/astra/discord',
                { query: [interaction.user.id] }
            );
            const data1 = res1.data;
            if (!data1?.uuid) {
                return interaction.editReply({
                    content: '❌ You are not linked in the EarthPol system...',
                    ephemeral: true
                });
            }
            // 2) re-insert hyphens
            const raw = data1.uuid.replace(/-/g, '');
            linkedUuid = raw.replace(
                /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
                '$1-$2-$3-$4-$5'
            );
            // 3) fetch player info
            const res2 = await axios.post(
                'https://api.earthpol.com/astra/players',
                { query: [linkedUuid] }
            );
            players = res2.data;
            if (!Array.isArray(players) || players.length === 0) {
                return interaction.editReply({
                    content: '❌ Your EarthPol player profile could not be found.',
                    ephemeral: true
                });
            }
        } catch (err) {
            console.error('Error checking EarthPol API:', err);
            return interaction.editReply({
                content: '⚠️ Problem verifying your link. Try again later.',
                ephemeral: true
            });
        }
        // ────────────────────────────────────────────────────────────────

        // ─── fetch town info if applicable ──────────────────────────────
        const player = players[0];
        let townData = null;
        if (player.town?.name) {
            try {
                const resTown = await axios.post(
                    'https://api.earthpol.com/astra/towns',
                    { query: [player.town.name] }
                );
                townData = Array.isArray(resTown.data) ? resTown.data[0] : null;
            } catch (err) {
                console.error('Failed to fetch town info:', err);
            }
        }
        // ────────────────────────────────────────────────────────────────

        // ─── bump ticket counter ────────────────────────────────────────
        const counterFile = path.resolve(process.cwd(), 'ticket-counter.txt');
        let ticketNumber = 0;
        try {
            ticketNumber = parseInt(fs.readFileSync(counterFile, 'utf8'), 10) || 0;
        } catch {}
        ticketNumber++;
        try {
            fs.writeFileSync(counterFile, ticketNumber.toString(), 'utf8');
        } catch (err) {
            console.error('Could not update ticket counter', err);
        }
        const ticketName = `ticket-${ticketNumber}`;
        // ────────────────────────────────────────────────────────────────

        // prevent duplicate tickets
        if (interaction.guild.channels.cache.some(c =>
            c.topic === interaction.user.id &&
            c.name === ticketName
        )) {
            return interaction.editReply({
                content: '❌ You already have an open ticket!',
                ephemeral: true
            });
        }

        await interaction.editReply({
            content: 'Creating your ticket…',
            ephemeral: true
        });

        // build permission overwrites
        const overwrites = [
            { id: interaction.guild.id, deny: ['VIEW_CHANNEL'] },
            {
                id: interaction.user.id,
                allow: [
                    'VIEW_CHANNEL',
                    'SEND_MESSAGES',
                    'READ_MESSAGE_HISTORY',
                    'ATTACH_FILES',
                    'EMBED_LINKS'
                ]
            }
        ];
        for (const roleId of ticketsSupportRoles) {
            overwrites.push({
                id: roleId,
                allow: [
                    'VIEW_CHANNEL',
                    'SEND_MESSAGES',
                    'READ_MESSAGE_HISTORY',
                    'ATTACH_FILES',
                    'EMBED_LINKS'
                ]
            });
        }

        // create channel
        const createdChannel = await interaction.guild.channels.create(ticketName, {
            type: 'text',
            topic: interaction.user.id,
            //parent: ticketsOpenCategory,
            permissionOverwrites: overwrites
        });

        // confirm creation
        await interaction.editReply({
            content: `✅ Ticket created: ${createdChannel}`,
            ephemeral: true
        });

        // send welcome embed + close button
        const row = new MessageActionRow().addComponents(
            new MessageButton()
                .setStyle('DANGER')
                .setEmoji('🔒')
                .setCustomId('ticket-close')
        );
        const welcomeEmbed = new MessageEmbed()
            .setTitle('🎫 New Ticket')
            .setDescription(
                `Hello <@${interaction.user.id}>, thanks for linking EarthPol account!\n` +
                `Minecraft UUID: ${linkedUuid}\n\n` +
                `Press 🔒 to close this ticket.`
            )
            .setColor(embedColor)
            .setFooter({
                text: embedfooterText,
                iconURL: client.user.displayAvatarURL()
            });
        const pings = ticketsSupportRoles.map(id => `<@&${id}>`).join(' ');
        await createdChannel.send({
            content: pings,
            embeds: [welcomeEmbed],
            components: [row]
        });

        // ─── send player info embed ─────────────────────────────────────
        const infoEmbed = new MessageEmbed()
            .setTitle('📝 Player Information')
            .addField('🆔 Name', player.name, true)
            .addField('🏘️ Town', player.town?.name ?? 'None', true)
            .addField('🌐 Nation', player.nation?.name ?? 'None', true)
            .addField('💰 Balance', `${player.stats?.balance ?? 0}`, true)
            .addField(
                '📅 Registered',
                new Date(player.timestamps.registered).toLocaleString(),
                true
            )
            .addField(
                '⏱️ Last Online',
                new Date(player.timestamps.lastOnline).toLocaleString(),
                true
            )
            .addField('🔢 UUID', player.uuid, true)
            .setColor(embedColor);
        await createdChannel.send({ embeds: [infoEmbed] });

        // ─── send town info embed if available ─────────────────────────
        if (townData) {
            const s = townData.status;
            const st = townData.stats;
            const perms = townData.perms;
            const ts = townData.timestamps;
            const flags = perms.flags || {};

            const boolRow = arr => arr.map(b => b ? '✅' : '❌').join('');

            const townEmbed = new MessageEmbed()
                .setTitle(`🏰 Town Information: ${townData.name}`)
                .addField('🙋 Mayor',     townData.mayor?.name ?? 'Unknown', true)
                .addField('🏛️ Capital',  s.isCapital ? 'Yes' : 'No',           true)
                .addField('📅 Created',  new Date(ts.registered).toLocaleDateString(), true)
                .addField('🔓 Public',   s.isPublic ? 'Yes' : 'No',            true)
                .addField('🚪 Open',     s.isOpen ? 'Yes' : 'No',              true)
                .addField('🏷️ For Sale', s.isForSale ? 'Yes' : 'No',           true)
                .addField('📦 Blocks',   `${st.numTownBlocks}/${st.maxTownBlocks}`, true)
                .addField('🧑‍🤝‍🧑 Residents', `${st.numResidents}`,             true)
                .addField('💵 Balance',  `${st.balance}`,                      true)
                .addField('💲 Sale Price', st.forSalePrice != null ? `${st.forSalePrice}` : 'N/A', true)
                // and the simple flags:
                .addField('⚔️ PvP',        flags.pvp ? '✅' : '❌',        true)
                .addField('💥 Explosions', flags.explosion ? '✅' : '❌', true)
                .addField('🔥 Fire',       flags.fire ? '✅' : '❌',      true)
                .addField('👾 Mobs',       flags.mobs ? '✅' : '❌',      true)
                // here are the 4-slot boolean rows:
                .addField('🛠️ Build',    boolRow(perms.build),   true)
                .addField('💥 Destroy',  boolRow(perms.destroy), true)
                .addField('🔄 Switch',   boolRow(perms.switch),  true)
                .addField('🎮 ItemUse',  boolRow(perms.itemUse), true)

                .setColor(embedColor);

            await createdChannel.send({ embeds: [townEmbed] });
        }
        // ────────────────────────────────────────────────────────────────
    }
};
