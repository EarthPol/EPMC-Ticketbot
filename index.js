// index.js
require('dotenv').config(); // load .env first

const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const handler = require('./handler/index');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
    ],
    partials: [
        Partials.Channel,   // for DMs
        Partials.Message,   // if you ever need messageReaction/client.message
        Partials.Reaction,  // same for reactions
    ],
});

// allow `send-panel.js` & other modules to use Discord constructors
client.discord = require('discord.js');

// collections for commands + slash commands
client.commands = new Collection();
client.slash    = new Collection();

// your config
client.config = require('./config.js');

// load everything
handler.loadEvents(client);
handler.loadCommands(client);
handler.loadSlashCommands(client);

// global error handlers
process.on('uncaughtException', err => {
    console.error('Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Possibly Unhandled Rejection at:', promise, 'reason:', reason);
});

// finally, log in
client.login(process.env.TOKEN);

module.exports = client;
