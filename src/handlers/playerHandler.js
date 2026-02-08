import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createNowPlayingEmbed, createMusicButtons } from '../utils/embeds.js';

export class PlayerHandler {
    constructor(client) {
        this.client = client;
    }

    setup() {
        const { kazagumo } = this.client;

        kazagumo.shoukaku.on('ready', (name) => {
            this.client.logger.success(`Lavalink node "${name}" is ready!`);
        });

        kazagumo.shoukaku.on('error', (name, error) => {
            this.client.logger.error(`Lavalink node "${name}" error:`, error);
        });

        kazagumo.shoukaku.on('close', (name, code, reason) => {
            this.client.logger.warn(`Lavalink node "${name}" closed [${code}]: ${reason}`);
        });

        kazagumo.shoukaku.on('disconnect', (name, count) => {
            this.client.logger.warn(`Lavalink node "${name}" disconnected, ${count} players affected`);
        });

        kazagumo.shoukaku.on('reconnecting', (name, left, timeout) => {
            this.client.logger.info(`Lavalink node "${name}" reconnecting... (${left} tries left)`);
        });

        kazagumo.on('playerStart', async (player, track) => {
            await this.#onTrackStart(player, track);
        });

        kazagumo.on('playerEnd', async (player) => {
            await this.#onTrackEnd(player);
        });

        kazagumo.on('playerEmpty', async (player) => {
            await this.#onQueueEnd(player);
        });

        kazagumo.on('playerDestroy', async (player) => {
            await this.#onPlayerDestroy(player);
        });

        kazagumo.on('playerStuck', async (player, data) => {
            await this.#onTrackStuck(player, data);
        });

        kazagumo.on('playerException', async (player, data) => {
            await this.#onTrackException(player, data);
        });

        kazagumo.on('playerResumed', async (player) => {
            this.client.logger.player('Resumed', player.guildId);
        });

        kazagumo.on('playerMoved', async (player, state, channels) => {
            await this.#onPlayerMoved(player, state, channels);
        });
    }

    async #onTrackStart(player, track) {
        const guild = this.client.guilds.cache.get(player.guildId);
        if (!guild) return;

        this.client.logger.player('Playing', guild.name, track.title);

        const lastTrack = player.data.get('currentTrack');
        if (lastTrack) {
            const history = player.data.get('history') || [];
            history.push(lastTrack);
            if (history.length > 50) history.shift();
            player.data.set('history', history);
        }
        player.data.set('currentTrack', {
            title: track.title,
            uri: track.uri,
            author: track.author,
            length: track.length,
            thumbnail: track.thumbnail,
            requester: track.requester,
            playedAt: Date.now()
        });

        this.client.db.incrementStats(player.guildId, 'songs_played');
        this.client.db.incrementStats(player.guildId, 'total_duration', track.length || 0);

        if (track.requester?.id) {
            this.client.db.addToHistory(player.guildId, track.requester.id, {
                title: track.title,
                uri: track.uri,
                duration: track.length,
                thumbnail: track.thumbnail,
                source: track.sourceName
            });
        }

        const settings = this.client.db.getGuildSettings(player.guildId);
        if (!settings.announce_songs) return;

        const textChannel = guild.channels.cache.get(player.textId);
        if (!textChannel) return;

        const embed = createNowPlayingEmbed(track, player);
        const buttons = createMusicButtons(player);

        try {
            if (player.nowPlayingMessage) {
                try {
                    await player.nowPlayingMessage.delete();
                } catch (e) { /* Ignore */ }
            }

            player.nowPlayingMessage = await textChannel.send({
                embeds: [embed],
                components: Array.isArray(buttons) ? buttons : [buttons]
            });
        } catch (error) {
            this.client.logger.error('Failed to send now playing message:', error);
        }
    }

    async #onTrackEnd(player) {
        if (player.nowPlayingMessage) {
            try {
                const embed = EmbedBuilder.from(player.nowPlayingMessage.embeds[0])
                    .setColor(0x808080)
                    .setFooter({ text: '✓ Track ended' });
                
                await player.nowPlayingMessage.edit({
                    embeds: [embed],
                    components: []
                });
            } catch (e) { /* Ignore */ }
            
            player.nowPlayingMessage = null;
        }
    }

    async #onQueueEnd(player) {
        const guild = this.client.guilds.cache.get(player.guildId);
        if (!guild) return;

        this.client.logger.player('Queue Empty', guild.name);

        const settings = this.client.db.getGuildSettings(player.guildId);
        const textChannel = guild.channels.cache.get(player.textId);

        if (player.data.get('autoplay')) {
            try {
                const lastTrack = player.queue.previous || player.queue.current;
                if (lastTrack) {
                    const searchQuery = `${lastTrack.author || ''} ${lastTrack.title || ''} mix`.trim();
                    const result = await this.client.kazagumo.search(searchQuery, { requester: lastTrack.requester });
                    
                    if (result.tracks.length > 0) {
                        const randomIndex = Math.floor(Math.random() * Math.min(5, result.tracks.length));
                        const nextTrack = result.tracks[randomIndex];
                        
                        if (nextTrack.uri !== lastTrack.uri) {
                            player.queue.add(nextTrack);
                            player.play();
                            
                            if (textChannel) {
                                const embed = new EmbedBuilder()
                                    .setColor(0xe94560)
                                    .setDescription(`🔄 **Autoplay:** Added **${nextTrack.title}** to the queue`)
                                    .setTimestamp();
                                try { await textChannel.send({ embeds: [embed] }); } catch (e) {}
                            }
                            return; // Don't continue to queue end logic
                        }
                    }
                }
            } catch (error) {
                this.client.logger.error('Autoplay error:', error);
            }
        }

        if (settings['247_enabled'] || player.data.get('247')) {
            if (textChannel) {
                const embed = new EmbedBuilder()
                    .setColor(0xe94560)
                    .setDescription('📭 **Queue has ended!** Add more songs to continue listening.\n🔒 *24/7 mode is active - staying in channel.*')
                    .setTimestamp();
                try { await textChannel.send({ embeds: [embed] }); } catch (e) {}
            }
            return; // Don't auto-leave in 24/7 mode
        }

        if (textChannel) {
            const embed = new EmbedBuilder()
                .setColor(0xe94560)
                .setDescription('📭 **Queue has ended!** Add more songs to continue listening.')
                .setTimestamp();

            try {
                await textChannel.send({ embeds: [embed] });
            } catch (e) { /* Ignore */ }
        }

        if (settings.auto_leave) {
            const timeout = (settings.auto_leave_timeout || 300) * 1000;
            
            player.autoLeaveTimeout = setTimeout(async () => {
                if (!player.queue.current && player.queue.size === 0) {
                    if (textChannel) {
                        const embed = new EmbedBuilder()
                            .setColor(0xff6b6b)
                            .setDescription('👋 **Left the voice channel** due to inactivity.')
                            .setTimestamp();

                        try {
                            await textChannel.send({ embeds: [embed] });
                        } catch (e) { /* Ignore */ }
                    }
                    
                    player.destroy();
                }
            }, timeout);
        }
    }

    async #onPlayerDestroy(player) {
        const guild = this.client.guilds.cache.get(player.guildId);
        this.client.logger.player('Destroyed', guild?.name || player.guildId);

        if (player.autoLeaveTimeout) {
            clearTimeout(player.autoLeaveTimeout);
        }

        if (player.nowPlayingMessage) {
            try {
                await player.nowPlayingMessage.delete();
            } catch (e) { /* Ignore */ }
        }
    }

    async #onTrackStuck(player, data) {
        const guild = this.client.guilds.cache.get(player.guildId);
        this.client.logger.warn(`Track stuck in ${guild?.name || player.guildId}:`, data);

        const textChannel = guild?.channels.cache.get(player.textId);
        if (textChannel) {
            const embed = new EmbedBuilder()
                .setColor(0xFFCC00)
                .setDescription('⚠️ **Track got stuck**, skipping to next...')
                .setTimestamp();

            try {
                await textChannel.send({ embeds: [embed] });
            } catch (e) { /* Ignore */ }
        }

        player.skip();
    }

    async #onTrackException(player, data) {
        const guild = this.client.guilds.cache.get(player.guildId);
        
        this.client.errorHandler.handlePlayerError(
            new Error(data.exception?.message || 'Unknown error'),
            player,
            player.queue.current
        );

        if (player.queue.size > 0) {
            player.skip();
        }
    }

    async #onPlayerMoved(player, state, channels) {
        if (state === 'DISCONNECTED') {
            player.destroy();
            return;
        }

        if (state === 'MOVED') {
            player.voiceId = channels.newChannelId;
        }
    }
}

export default PlayerHandler;
