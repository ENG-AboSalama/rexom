import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { canUseMusic, isValidURL } from '../../utils/validators.js';
import { successEmbed, errorEmbed, Colors, createNowPlayingEmbed, createMusicButtons } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song or playlist')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name, URL, or playlist link')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('source')
                .setDescription('Music source')
                .setRequired(false)
                .addChoices(
                    { name: '🔍 Auto', value: 'auto' },
                    { name: '🎵 YouTube', value: 'youtube' },
                    { name: '🎵 YouTube Music', value: 'youtube_music' },
                    { name: '🟢 Spotify', value: 'spotify' },
                    { name: '☁️ SoundCloud', value: 'soundcloud' },
                    { name: '🍎 Apple Music', value: 'apple_music' },
                    { name: '🎵 Deezer', value: 'deezer' }
                )
        )
        .addBooleanOption(option =>
            option.setName('shuffle')
                .setDescription('Shuffle playlist before adding')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('next')
                .setDescription('Add to front of queue')
                .setRequired(false)
        ),
    
    category: 'music',
    cooldown: 3,

    async execute(client, interaction) {
        const validation = canUseMusic(interaction, client);
        if (!validation.valid) {
            return interaction.reply({
                embeds: [errorEmbed(validation.message)],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const query = interaction.options.getString('query');
        const source = interaction.options.getString('source') || 'auto';
        const shuffle = interaction.options.getBoolean('shuffle') || false;
        const next = interaction.options.getBoolean('next') || false;

        const voiceChannel = interaction.member.voice.channel;
        const settings = client.db.getGuildSettings(interaction.guildId);

        try {
            let searchEngine = 'youtube';
            let sourcePrefix = null;
            
            if (source === 'youtube_music') searchEngine = 'youtube_music';
            else if (source === 'soundcloud') searchEngine = 'soundcloud';
            else if (source === 'spotify') { searchEngine = null; sourcePrefix = 'spsearch:'; }
            else if (source === 'apple_music') { searchEngine = null; sourcePrefix = 'amsearch:'; }
            else if (source === 'deezer') { searchEngine = null; sourcePrefix = 'dzsearch:'; }
            else if (source === 'auto' && isValidURL(query)) searchEngine = null;

            let searchOptions = { requester: interaction.user };
            if (sourcePrefix) {
                searchOptions.source = sourcePrefix;
            } else if (searchEngine) {
                searchOptions.engine = searchEngine;
            }

            let result = await client.kazagumo.search(query, searchOptions);

            if (!result.tracks.length && (sourcePrefix || isValidURL(query))) {
                client.logger.warn(`Search failed for: ${query} (source=${sourcePrefix || 'url'}), retrying with YouTube...`);
                result = await client.kazagumo.search(query, {
                    requester: interaction.user,
                    engine: 'youtube'
                });
            }

            if (!result.tracks.length) {
                client.logger.warn(`Search returned 0 results | query="${query}" | engine="${searchEngine}" | type="${result.type}"`);
                return interaction.editReply({
                    embeds: [errorEmbed('No results found for your query. Try a different search term.')]
                });
            }

            let player = client.kazagumo.players.get(interaction.guildId);

            if (!player) {
                player = await client.kazagumo.createPlayer({
                    guildId: interaction.guildId,
                    voiceId: voiceChannel.id,
                    textId: interaction.channelId,
                    deaf: true,
                    volume: settings.default_volume || 100
                });
            }

            let tracks = result.tracks;
            let description = '';

            if (result.type === 'PLAYLIST') {
                if (shuffle) {
                    for (let i = tracks.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
                    }
                }

                if (next) {
                    for (let i = tracks.length - 1; i >= 0; i--) {
                        player.queue.unshift(tracks[i]);
                    }
                } else {
                    player.queue.add(tracks);
                }

                description = `**Playlist:** [${result.playlistName}](${query})\n` +
                    `**Tracks:** ${tracks.length}\n` +
                    `**Position:** ${next ? 'Next up' : `#${player.queue.size - tracks.length + 1}`}`;

            } else {
                const track = tracks[0];
                
                if (next) {
                    player.queue.unshift(track);
                } else {
                    player.queue.add(track);
                }

                description = `**[${track.title}](${track.uri})**\n` +
                    `**Duration:** ${formatDuration(track.length)}\n` +
                    `**Artist:** ${track.author}\n` +
                    `**Position:** ${next ? 'Next up' : `#${player.queue.size}`}`;
            }

            if (!player.playing && !player.paused) {
                await player.play();
            }

            const embed = new EmbedBuilder()
                .setColor(Colors.success)
                .setAuthor({ 
                    name: result.type === 'PLAYLIST' ? '📋 Playlist Added' : '🎵 Added to Queue',
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setDescription(description)
                .setFooter({ text: `Requested by ${interaction.user.username}` })
                .setTimestamp();

            const thumbnail = tracks[0]?.thumbnail;
            if (thumbnail) {
                embed.setThumbnail(thumbnail);
            }

            await interaction.editReply({ 
                embeds: [embed]
            });

        } catch (error) {
            client.logger.error('Play command error:', error);
            await interaction.editReply({
                embeds: [errorEmbed('Failed to play the track. Please try again.')]
            });
        }
    },

    async autocomplete(client, interaction) {
        const focused = interaction.options.getFocused();
        
        if (!focused || focused.length < 2) {
            return interaction.respond([]);
        }

        try {
            const choices = [];
            
            const recentSearches = client.db?.getUserRecentSearches?.(interaction.user.id, 3) || [];
            
            for (const recent of recentSearches) {
                if (recent.query.toLowerCase().includes(focused.toLowerCase())) {
                    choices.push({
                        name: `🕐 ${recent.query}`.substring(0, 100),
                        value: recent.query
                    });
                }
            }

            const favorites = client.db?.getUserFavorites?.(interaction.user.id) || [];
            for (const fav of favorites.slice(0, 3)) {
                if (fav.title.toLowerCase().includes(focused.toLowerCase())) {
                    choices.push({
                        name: `❤️ ${fav.title}`.substring(0, 100),
                        value: fav.uri
                    });
                }
            }

            const result = await client.kazagumo.search(focused, {
                engine: 'youtube'
            });

            for (const track of result.tracks.slice(0, 8)) {
                if (choices.length >= 25) break;
                
                const duration = track.length ? formatDuration(track.length) : 'Live';
                choices.push({
                    name: `🎵 ${track.title} [${duration}]`.substring(0, 100),
                    value: track.uri
                });
            }

            try {
                if (client.lastfm) {
                    const lastfmResults = await client.lastfm.searchTrack(focused, 3);
                    for (const track of lastfmResults) {
                        if (choices.length >= 25) break;
                        choices.push({
                            name: `📻 ${track.name} - ${track.artist}`.substring(0, 100),
                            value: `${track.name} ${track.artist}`
                        });
                    }
                }
            } catch {
            }

            await interaction.respond(choices.slice(0, 25));
        } catch (error) {
            await interaction.respond([]);
        }
    }
};

function formatDuration(ms) {
    if (!ms || ms === 0) return 'Live';
    
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
