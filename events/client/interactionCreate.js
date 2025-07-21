// events/client/interactionCreate.js
const {
    ActionRowBuilder,
    ButtonBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
    ButtonStyle
} = require('discord.js');
const createTicket = require('../tickets/createTicket');

// In-memory state for the "Report a Player" wizard
const reportState = new Map();

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        // ─── 1) Component Interactions ─────────────────────────────────────

        // a) Button clicks: modals & wizard start
        if (interaction.isButton()) {
            switch (interaction.customId) {
                // ── General Ticket → simple modal
                case 'general_ticket': {
                    const modal = new ModalBuilder()
                        .setCustomId('modal_general')
                        .setTitle('General Ticket');
                    const input = new TextInputBuilder()
                        .setCustomId('general_desc')
                        .setLabel('What can we help you with?')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(input));
                    return interaction.showModal(modal);
                }

                // ── Bug Report → two-field modal
                case 'bug_report': {
                    const modal = new ModalBuilder()
                        .setCustomId('modal_bug')
                        .setTitle('Bug Report');
                    const titleIn = new TextInputBuilder()
                        .setCustomId('bug_title')
                        .setLabel('Short Bug Title')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);
                    const descIn = new TextInputBuilder()
                        .setCustomId('bug_desc')
                        .setLabel('Detailed Description')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true);
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(titleIn),
                        new ActionRowBuilder().addComponents(descIn)
                    );
                    return interaction.showModal(modal);
                }

                // ── Staff Abuse → two-field modal
                case 'report_staff': {
                    const modal = new ModalBuilder()
                        .setCustomId('modal_staff')
                        .setTitle('Report Staff Abuse');
                    const staffIn = new TextInputBuilder()
                        .setCustomId('staff_name')
                        .setLabel('Staff Member Username')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);
                    const descIn2 = new TextInputBuilder()
                        .setCustomId('staff_desc')
                        .setLabel('What happened?')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true);
                    modal.addComponents(
                        new ActionRowBuilder().addComponents(staffIn),
                        new ActionRowBuilder().addComponents(descIn2)
                    );
                    return interaction.showModal(modal);
                }

                // ── Report a Player → start select-menu wizard
                case 'report_player': {
                    // clear old state
                    reportState.delete(interaction.user.id);
                    const row = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('report_type')
                            .setPlaceholder('Select report type…')
                            .addOptions([
                                { label: 'Hacking',    value: 'hacking'  },
                                { label: 'Harassment', value: 'harassment' },
                                { label: 'Other',      value: 'other'     }
                            ])
                    );
                    return interaction.reply({
                        content: 'What type of report would you like to file?',
                        components: [row],
                        ephemeral: true
                    });
                }
            }
        }

        // ─── 2) Modal submissions ─────────────────────────────────────────
        if (interaction.isModalSubmit()) {
            switch (interaction.customId) {
                case 'modal_general': {
                    const desc = interaction.fields.getTextInputValue('general_desc');
                    return createTicket(interaction, { category: 'general', description: desc });
                }
                case 'modal_bug': {
                    const title = interaction.fields.getTextInputValue('bug_title');
                    const desc  = interaction.fields.getTextInputValue('bug_desc');
                    return createTicket(interaction, { category: 'bug', title, description: desc });
                }
                case 'modal_staff': {
                    const staff = interaction.fields.getTextInputValue('staff_name');
                    const desc2 = interaction.fields.getTextInputValue('staff_desc');
                    return createTicket(interaction, { category: 'staff_abuse', target: staff, description: desc2 });
                }
            }
        }

        // ─── 3) Wizard: Report a Player SelectMenu ─────────────────────────
        if (interaction.isStringSelectMenu() && interaction.customId === 'report_type') {
            const type = interaction.values[0];
            if (type === 'harassment') {
                // record category
                reportState.set(interaction.user.id, { category: 'harassment' });
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('harassment_targeted_yes')
                        .setLabel('Yes')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('harassment_targeted_no')
                        .setLabel('No')
                        .setStyle(ButtonStyle.Danger)
                );
                return interaction.update({
                    content: 'Was the harassment targeted directly at you?',
                    components: [row]
                });
            }
            // hacking or other → immediate ticket
            return createTicket(interaction, { category: type });
        }

        // ─── 4) Harassment targeted? ──────────────────────────────────────
        if (interaction.isButton() && interaction.customId.startsWith('harassment_targeted_')) {
            const yes = interaction.customId.endsWith('_yes');
            if (!yes) {
                reportState.delete(interaction.user.id);
                return interaction.update({ content: 'Only the direct target can file a harassment report; ticket cancelled.', components: [] });
            }
            // mark targeted
            reportState.get(interaction.user.id).targeted = true;
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ignore_used_yes')
                    .setLabel('Yes')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('ignore_used_no')
                    .setLabel('No')
                    .setStyle(ButtonStyle.Danger)
            );
            return interaction.update({ content: 'Have you used `/ignore <theirName>` to block them first?', components: [row] });
        }

        // ─── 5) /ignore used? ─────────────────────────────────────────────
        if (interaction.isButton() && interaction.customId.startsWith('ignore_used_')) {
            const yes = interaction.customId.endsWith('_yes');
            if (!yes) {
                reportState.delete(interaction.user.id);
                return interaction.update({ content: 'Please use `/ignore` before filing; ticket cancelled.', components: [] });
            }
            // finalize state
            const final = reportState.get(interaction.user.id);
            reportState.delete(interaction.user.id);
            return createTicket(interaction, {
                category: 'harassment',
                targeted: Boolean(final.targeted),
                ignoreUsed: true
            });
        }

        // ─── 6) Slash‑command fallback ─────────────────────────────────────
        if (!interaction.isCommand()) return;
        const command = client.slash.get(interaction.commandName);
        if (!command) return interaction.reply({ content: '❌ Unknown command', ephemeral: true });
        if (command.ownerOnly && interaction.user.id !== client.config.ownerID) {
            return interaction.reply({ content: '❌ Bot owner only', ephemeral: true });
        }

        // gather args & execute
        const args = [];
        for (const opt of interaction.options.data) {
            if (opt.type === 'SUB_COMMAND') {
                args.push(opt.name, ...(opt.options?.map(o => o.value) || []));
            } else if (opt.value) {
                args.push(opt.value);
            }
        }

        try {
            await command.run(client, interaction, args);
        } catch (err) {
            console.error(err);
            interaction.reply({ content: `❌ Error: ${err.message}`, ephemeral: true });
        }
    }
};
