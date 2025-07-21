// handler/index.js
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

/**
 * Load Events from /events/*
 */
async function loadEvents(client) {
    const eventFolders = fs.readdirSync(path.join(__dirname, '..', 'events'));
    for (const folder of eventFolders) {
        const files = fs
            .readdirSync(path.join(__dirname, '..', 'events', folder))
            .filter(f => f.endsWith('.js'));
        for (const file of files) {
            // skip the createTicket helper (not an event)
            if (folder === 'tickets' && file === 'createTicket.js') continue;
            const event = require(path.join(__dirname, '..', 'events', folder, file));
            if (!event.name || typeof event.execute !== 'function') {
                console.log(chalk.bgRedBright.black(` ❌ Event ${file} missing name or execute()`));
                continue;
            }
            console.log(chalk.bgBlueBright.black(` ✔️ => Event ${file} loaded`));
            if (event.once) client.once(event.name, (...args) => event.execute(...args, client));
            else client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
}

/**
 * Load Prefix Commands from /commands/*
 */
async function loadCommands(client) {
    client.aliases = new Map();
    const cmdFolders = fs.readdirSync(path.join(__dirname, '..', 'commands'));
    for (const folder of cmdFolders) {
        const files = fs
            .readdirSync(path.join(__dirname, '..', 'commands', folder))
            .filter(f => f.endsWith('.js'));
        for (const file of files) {
            const cmd = require(path.join(__dirname, '..', 'commands', folder, file));
            if (!cmd.name || typeof cmd.run !== 'function') {
                console.log(chalk.bgRedBright.black(` ❌ Prefix Command ${file} missing name or run()`));
                continue;
            }
            client.commands.set(cmd.name, cmd);
            console.log(chalk.bgBlueBright.black(` ✔️ => Prefix Command ${file} loaded`));
            if (Array.isArray(cmd.aliases)) cmd.aliases.forEach(a => client.aliases.set(a, cmd.name));
        }
    }
}

/**
 * Load & register Slash Commands from /slashCommands/*
 */
async function loadSlashCommands(client) {
    const slashPayload = [];
    const slashFolders = fs.readdirSync(path.join(__dirname, '..', 'slashCommands'));
    for (const folder of slashFolders) {
        const files = fs
            .readdirSync(path.join(__dirname, '..', 'slashCommands', folder))
            .filter(f => f.endsWith('.js'));
        for (const file of files) {
            const cmd = require(path.join(__dirname, '..', 'slashCommands', folder, file));
            if (!cmd.data?.name || typeof cmd.run !== 'function') {
                console.log(chalk.bgRedBright.black(` ❌ SlashCommand ${file} missing data.name or run()`));
                continue;
            }
            client.slash.set(cmd.data.name, cmd);
            slashPayload.push(cmd.data.toJSON());
            console.log(chalk.bgBlueBright.black(` ✔️ => SlashCommand ${file} loaded`));
        }
    }

    // register after ready event
    client.once('ready', async () => {
        const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
        try {
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, client.config.guildID),
                { body: slashPayload }
            );
            console.log(chalk.bgGreenBright.black(` ✅ Registered ${slashPayload.length} slash commands`));
        } catch (err) {
            console.error(err);
        }
    });
}

module.exports = { loadEvents, loadCommands, loadSlashCommands };