// events/tickets/createTicket.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const {
    abuseSupportRoles,
    ticketsSupportRoles,
    ticketsOpenCategory,
    embedColor,
    embedfooterText
} = require('../../config.js');

const {
    ActionRowBuilder,
    ButtonBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType,
    ButtonStyle
} = require('discord.js');

/**
 * Full ticket creation: EarthPol check, channel creation, and embeds.
 */
module.exports = async function createTicket(interaction, opts) {
    // 1) Verify EarthPol linkage
    let linkedUuid, players;
    try {
        const res1 = await axios.post(
            'https://api.earthpol.com/astra/discord',
            { query: [interaction.user.id] }
        );
        if (!res1.data?.uuid) {
            return interaction.reply({ content: '❌ You are not linked in the EarthPol system.', ephemeral: true });
        }
        const raw = res1.data.uuid.replace(/-/g, '');
        linkedUuid = raw.replace(/^(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})$/, '$1-$2-$3-$4-$5');

        const res2 = await axios.post(
            'https://api.earthpol.com/astra/players',
            { query: [linkedUuid] }
        );
        players = res2.data;
        if (!Array.isArray(players) || players.length === 0) {
            return interaction.reply({ content: '❌ Your EarthPol player profile could not be found.', ephemeral: true });
        }
    } catch (err) {
        console.error('EarthPol API error:', err);
        return interaction.reply({ content: '⚠️ Problem verifying your link. Try again later.', ephemeral: true });
    }

    // 2) Optional: fetch town info
    const player = players[0];
    let townData = null;
    if (player.town?.name) {
        try {
            const resTown = await axios.post(
                'https://api.earthpol.com/astra/towns',
                { query: [player.town.name] }
            );
            if (Array.isArray(resTown.data) && resTown.data.length) {
                townData = resTown.data[0];
            }
        } catch (e) {
            console.error('Town API error:', e);
        }
    }

    // 3) Bump counter and compute channel name
    const counterFile = path.resolve(process.cwd(), 'ticket-counter.txt');
    let ticketNumber = parseInt(fs.readFileSync(counterFile, 'utf8'), 10) || 0;
    ticketNumber++;
    fs.writeFileSync(counterFile, ticketNumber.toString(), 'utf8');
    const channelName = `ticket-${ticketNumber}`;

    // 4) Prevent duplicates
    if (
        interaction.guild.channels.cache.some(
            c => c.topic === interaction.user.id && c.name === channelName
        )
    ) {
        return interaction.reply({ content: '❌ You already have an open ticket!', ephemeral: true });
    }

    // 5) Notify user
    await interaction.reply({ content: 'Creating your ticket…', ephemeral: true });

    const supportRoles = opts.category === 'staff_abuse' ? abuseSupportRoles : ticketsSupportRoles;

    // 6) Build overwrites and create channel
    const overwrites = [
        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: interaction.user.id, allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks
            ]},
        ...supportRoles.map(id => ({
            id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks
            ]
        }))
    ];

    const createdChannel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        //parent: ticketsOpenCategory,
        topic: interaction.user.id,
        permissionOverwrites: overwrites
    });

    // 7) Confirmation and welcome embed
    await interaction.followUp({ content: `✅ Your ticket is ready: <#${createdChannel.id}>`, ephemeral: true });

    const welcomeEmbed = new EmbedBuilder()
        .setTitle('🎫 New Ticket')
        .setDescription(`Hello <@${interaction.user.id}>, your account is linked!\nMinecraft UUID: ${linkedUuid}`)
        .setColor(embedColor)
        .setFooter({ text: embedfooterText, iconURL: interaction.client.user.displayAvatarURL() });

    const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket-close')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
    );

    await createdChannel.send({
        content: ticketsSupportRoles.map(r => `<@&${r}>`).join(' '),
        embeds: [welcomeEmbed],
        components: [closeRow]
    });

    // 8) Player information embed
    const infoEmbed = new EmbedBuilder()
        .setTitle('📝 Player Information')
        .addFields(
            { name: '🆔 Name',        value: player.name, inline: true },
            { name: '🏘️ Town',       value: player.town?.name ?? 'None', inline: true },
            { name: '🌐 Nation',     value: player.nation?.name ?? 'None', inline: true },
            { name: '💰 Balance',    value: `${player.stats?.balance ?? 0}`, inline: true },
            { name: '📅 Registered', value: new Date(player.timestamps.registered).toLocaleString(), inline: true },
            { name: '⏱️ Last Online', value: new Date(player.timestamps.lastOnline).toLocaleString(), inline: true },
            { name: '🔢 UUID',       value: player.uuid, inline: true }
        )
        .setColor(embedColor);
    await createdChannel.send({ embeds: [infoEmbed] });

    // 9) Town information embed
    if (townData) {
        const s = townData.status;
        const st = townData.stats;
        const perms = townData.perms;
        const ts = townData.timestamps;
        const flags = perms.flags || {};
        const boolRow = arr => arr.map(b => (b ? '✅' : '❌')).join('');

        const townEmbed = new EmbedBuilder()
            .setTitle(`🏰 Town Information: ${townData.name}`)
            .addFields(
                { name: '🙋 Mayor',      value: townData.mayor?.name ?? 'Unknown', inline: true },
                { name: '🏛️ Capital',    value: s.isCapital ? 'Yes' : 'No', inline: true },
                { name: '📅 Created',    value: new Date(ts.registered).toLocaleDateString(), inline: true },
                { name: '🔓 Public',     value: s.isPublic ? 'Yes' : 'No', inline: true },
                { name: '🚪 Open',       value: s.isOpen ? 'Yes' : 'No', inline: true },
                { name: '🏷️ For Sale',    value: s.isForSale ? 'Yes' : 'No', inline: true },
                { name: '📦 Blocks',     value: `${st.numTownBlocks}/${st.maxTownBlocks}`, inline: true },
                { name: '🧑‍🤝‍🧑 Residents', value: `${st.numResidents}`, inline: true },
                { name: '💵 Balance',    value: `${st.balance}`, inline: true },
                { name: '💲 Sale Price', value: st.forSalePrice != null ? `${st.forSalePrice}` : 'N/A', inline: true },
                { name: '⚔️ PvP',        value: flags.pvp ? '✅' : '❌', inline: true },
                { name: '💥 Explosions', value: flags.explosion ? '✅' : '❌', inline: true },
                { name: '🔥 Fire',       value: flags.fire ? '✅' : '❌', inline: true },
                { name: '👾 Mobs',       value: flags.mobs ? '✅' : '❌', inline: true },
                { name: '🛠️ Build',     value: boolRow(perms.build), inline: true },
                { name: '💥 Destroy',    value: boolRow(perms.destroy), inline: true },
                { name: '🔄 Switch',      value: boolRow(perms.switch), inline: true },
                { name: '🎮 ItemUse',    value: boolRow(perms.itemUse), inline: true }
            )
            .setColor(embedColor);
        await createdChannel.send({ embeds: [townEmbed] });
    }


    if (opts.category === 'general') {
        const details = new EmbedBuilder()
            .setTitle('📝 General Ticket Details')
            .setDescription(opts.description || 'No description provided.')
            .setColor(embedColor);
        await createdChannel.send({ embeds: [details] });

    } else if (opts.category === 'bug') {
        const details = new EmbedBuilder()
            .setTitle(`🐞 Bug Report: ${opts.title}`)
            .setDescription(opts.description || 'No description provided.')
            .setColor(embedColor);
        await createdChannel.send({ embeds: [details] });

    } else if (opts.category === 'staff_abuse') {
        const details = new EmbedBuilder()
            .setTitle(`🚨 Staff Abuse: ${opts.target}`)
            .setDescription(opts.description || 'No description provided.')
            .setColor(embedColor);
        await createdChannel.send({ embeds: [details] });

    } else if (opts.category === 'harassment') {
        const answersEmbed = new EmbedBuilder()
            .setTitle('📝 Harassment Report Details')
            .addFields(
                { name: 'Targeted Victim?', value: opts.targeted ? 'Yes' : 'No', inline: true },
                { name: 'Used /ignore?',    value: opts.ignoreUsed ? 'Yes' : 'No', inline: true }
            )
            .setColor(embedColor);
        await createdChannel.send({ embeds: [answersEmbed] });
    } else if (opts.category === 'item_restoration') {
        const restoreEmbed = new EmbedBuilder()
            .setTitle('🛠️ Item Restoration Request')
            .setDescription(opts.description)
            .addFields({ name: 'Chest Coordinates', value: opts.coords })
            .setColor(embedColor);

        await createdChannel.send({ embeds: [restoreEmbed] });
    }
};