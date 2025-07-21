// handler/index.js
const fs = require("fs");
const chalk = require("chalk");
const { Collection } = require("discord.js");

/**
 * Load Events
 */
const loadEvents = async function (client) {
    const eventFolders = fs.readdirSync("./events");
    for (const folder of eventFolders) {
        const eventFiles = fs
            .readdirSync(`./events/${folder}`)
            .filter((file) => file.endsWith(".js"));

        for (const file of eventFiles) {
            const event = require(`../events/${folder}/${file}`);
            if (event.name) {
                console.log(chalk.bgBlueBright.black(` ✔️ => Event ${file} is being loaded `));
            } else {
                console.log(chalk.bgRedBright.black(` ❌ => Event ${file} missing a name property`));
                continue;
            }

            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
        }
    }
};

/**
 * Load Prefix Commands
 */
const loadCommands = async function (client) {
    // ensure these collections exist
    if (!client.commands) client.commands = new Collection();
    if (!client.aliases)  client.aliases  = new Collection();

    const commandFolders = fs.readdirSync("./commands");
    for (const folder of commandFolders) {
        const commandFiles = fs
            .readdirSync(`./commands/${folder}`)
            .filter((file) => file.endsWith(".js"));

        for (const file of commandFiles) {
            const command = require(`../commands/${folder}/${file}`);

            if (command.name) {
                client.commands.set(command.name, command);
                console.log(chalk.bgBlueBright.black(` ✔️ => Prefix Command ${file} is being loaded `));
            } else {
                console.log(chalk.bgRedBright.black(` ❌ => Prefix Command ${file} missing a name property`));
                continue;
            }

            // only if aliases is an actual array
            if (command.aliases && Array.isArray(command.aliases)) {
                for (const alias of command.aliases) {
                    client.aliases.set(alias, command.name);
                }
            }
        }
    }
};

/**
 * Load SlashCommands
 */
const loadSlashCommands = async function (client) {
    let slashData = [];

    const commandFolders = fs.readdirSync("./slashCommands");
    for (const folder of commandFolders) {
        const commandFiles = fs
            .readdirSync(`./slashCommands/${folder}`)
            .filter((file) => file.endsWith(".js"));

        for (const file of commandFiles) {
            const command = require(`../slashCommands/${folder}/${file}`);

            // v14: we expect a `data` property from SlashCommandBuilder
            if (command.data && typeof command.data.name === "string") {
                client.slash.set(command.data.name, command);
                slashData.push(command.data.toJSON());
                console.log(chalk.bgBlueBright.black(` ✔️ => SlashCommand ${file} is being loaded `));
            } else {
                console.log(chalk.bgRedBright.black(` ❌ => SlashCommand ${file} missing a data.name`));
                continue;
            }
        }
    }

    client.on("ready", async () => {
        const guild = client.guilds.cache.get(client.config.guildID);
        if (!guild) {
            console.warn("⚠️  Could not find guild to register slash commands");
            return;
        }
        await guild.commands.set(slashData);
        console.log(chalk.bgGreenBright.black(` 🌐 Registered ${slashData.length} slash commands`));
    });
};

module.exports = {
    loadEvents,
    loadCommands,
    loadSlashCommands
};
