import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { Connectors } from 'shoukaku';
import { Kazagumo, Plugins } from 'kazagumo';
import chalk from 'chalk';

import { Logger } from './core/Logger.js';
import { Database } from './core/Database.js';
import { ErrorHandler } from './core/ErrorHandler.js';
import { CommandHandler } from './handlers/commandHandler.js';
import { EventHandler } from './handlers/eventHandler.js';
import { PlayerHandler } from './handlers/playerHandler.js';
import { ComponentHandler } from './handlers/ComponentHandler.js';
import { createDashboard } from './dashboard/server.js';
import { LastFM } from './utils/lastfm.js';
import { LyricsManager } from './utils/genius.js';
import { AIRecommendations } from './utils/ai-recommendations.js';

const banner = `
${chalk.hex('#e94560')('╔═══════════════════════════════════════════════════════════════════════════╗')}
${chalk.hex('#e94560')('║')}                                                                           ${chalk.hex('#e94560')('║')}
${chalk.hex('#e94560')('║')}   ${chalk.hex('#ff6b6b')('██████╗ ███████╗██╗  ██╗ ██████╗ ███╗   ███╗')}                            ${chalk.hex('#e94560')('║')}
${chalk.hex('#e94560')('║')}   ${chalk.hex('#ff6b6b')('██╔══██╗██╔════╝╚██╗██╔╝██╔═══██╗████╗ ████║')}                            ${chalk.hex('#e94560')('║')}
${chalk.hex('#e94560')('║')}   ${chalk.hex('#ff6b6b')('██████╔╝█████╗   ╚███╔╝ ██║   ██║██╔████╔██║')}                            ${chalk.hex('#e94560')('║')}
${chalk.hex('#e94560')('║')}   ${chalk.hex('#ff6b6b')('██╔══██╗██╔══╝   ██╔██╗ ██║   ██║██║╚██╔╝██║')}                            ${chalk.hex('#e94560')('║')}
${chalk.hex('#e94560')('║')}   ${chalk.hex('#ff6b6b')('██║  ██║███████╗██╔╝ ██╗╚██████╔╝██║ ╚═╝ ██║')}                            ${chalk.hex('#e94560')('║')}
${chalk.hex('#e94560')('║')}   ${chalk.hex('#ff6b6b')('╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝')}                            ${chalk.hex('#e94560')('║')}
${chalk.hex('#e94560')('║')}                                                                           ${chalk.hex('#e94560')('║')}
${chalk.hex('#e94560')('║')}   ${chalk.white('Version:')} ${chalk.cyan('Resurrection v1.0.0')}  ${chalk.white('│')}  ${chalk.white('Audio:')} ${chalk.green('Lavalink v4')}  ${chalk.white('│')}  ${chalk.white('Node:')} ${chalk.yellow(process.version)}  ${chalk.hex('#e94560')('║')}
${chalk.hex('#e94560')('║')}   ${chalk.gray('Rexom — The Ultimate Discord Music Bot')}                                  ${chalk.hex('#e94560')('║')}
${chalk.hex('#e94560')('║')}                                                                           ${chalk.hex('#e94560')('║')}
${chalk.hex('#e94560')('╚═══════════════════════════════════════════════════════════════════════════╝')}
`;

console.log(banner);

const logger = new Logger();

const requiredEnvVars = ['DISCORD_TOKEN', 'CLIENT_ID'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
    logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
}

const LavalinkNodes = [{
    name: process.env.LAVALINK_NAME || 'Rexom-Main',
    url: `${process.env.LAVALINK_HOST || 'localhost'}:${process.env.LAVALINK_PORT || '2333'}`,
    auth: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
    secure: process.env.LAVALINK_SECURE === 'true',
}];

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember,
    ],
    allowedMentions: { parse: ['users', 'roles'], repliedUser: true },
});

client.commands = new Collection();
client.aliases = new Collection();
client.cooldowns = new Collection();
client.buttons = new Collection();
client.selectMenus = new Collection();
client.modals = new Collection();

client.logger = logger;
client.db = new Database();
client.errorHandler = new ErrorHandler(client);

if (process.env.LASTFM_API_KEY) {
    client.lastfm = new LastFM(process.env.LASTFM_API_KEY);
    logger.info('Last.fm integration enabled');
}

if (process.env.GENIUS_API_KEY) {
    client.lyrics = new LyricsManager(process.env.GENIUS_API_KEY);
    logger.info('Genius lyrics integration enabled');
}

client.aiRecommendations = new AIRecommendations(client);
logger.info('AI Recommendations engine enabled');

client.kazagumo = new Kazagumo(
    {
        defaultSearchEngine: 'youtube',
        plugins: [new Plugins.PlayerMoved(client)],
        send: (guildId, payload) => {
            const guild = client.guilds.cache.get(guildId);
            if (guild) guild.shard.send(payload);
        },
    },
    new Connectors.DiscordJS(client),
    LavalinkNodes,
    {
        resume: true,
        resumeTimeout: 60,
        reconnectTries: 10,
        reconnectInterval: 5,
        restTimeout: 60000,
        moveOnDisconnect: true,
        voiceConnectionTimeout: 30000,
    }
);

client.kazagumo.on('debug', (info) => {
    if (info.includes('Searched')) logger.info(`[Kazagumo] ${info}`);
});

async function main() {
    try {
        logger.divider();
        logger.info('Starting Rexom Music Bot...');
        logger.divider();

        logger.info('Initializing database...');
        await client.db.init();
        logger.success('Database initialized');

        const commandHandler = new CommandHandler(client);
        const eventHandler = new EventHandler(client);
        const playerHandler = new PlayerHandler(client);
        const componentHandler = new ComponentHandler(client);

        logger.info('Loading commands...');
        await commandHandler.load();
        logger.success(`Loaded ${client.commands.size} commands`);

        logger.info('Loading events...');
        await eventHandler.load();
        logger.success('Events loaded');

        logger.info('Setting up player events...');
        playerHandler.setup();
        logger.success('Player events configured');

        logger.info('Loading component handlers...');
        await componentHandler.load();
        logger.success('Component handlers loaded');

        logger.divider();
        logger.info('Connecting to Discord...');
        await client.login(process.env.DISCORD_TOKEN);

        const commandData = client.commands.filter(cmd => cmd.data).map(cmd => cmd.data.toJSON());
        await client.application.commands.set(commandData);
        logger.success(`Deployed ${commandData.length} slash commands`);

        if (process.env.DISCORD_CLIENT_SECRET && process.env.SESSION_SECRET) {
            logger.divider();
            logger.info('Starting dashboard...');
            try {
                createDashboard(client);
            } catch (dashError) {
                logger.error('Dashboard initialization failed:', dashError.message);
                logger.warn('Bot will continue running without dashboard');
            }
        } else {
            logger.warn('Dashboard disabled: DISCORD_CLIENT_SECRET or SESSION_SECRET not configured');
        }

    } catch (error) {
        logger.error('Failed to start bot:', error);
        process.exit(1);
    }
}

async function shutdown(signal) {
    logger.divider();
    logger.warn(`Received ${signal}, shutting down...`);

    try {
        for (const [, player] of client.kazagumo.players) {
            try { await player.destroy(); } catch (e) { /* ignore */ }
        }
        client.db?.close();
        await client.destroy();
        logger.success('Shutdown complete');
        process.exit(0);
    } catch (error) {
        logger.error('Shutdown error:', error);
        process.exit(1);
    }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (error) => logger.error('Unhandled Rejection:', error));
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    setTimeout(() => process.exit(1), 1000);
});

main();

export default client;
