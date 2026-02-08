import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { canUseMusic } from '../../utils/validators.js';
import { successEmbed, errorEmbed, Colors } from '../../utils/embeds.js';
import { RadioBrowserAPI } from '../../utils/integrations.js';

const radioAPI = new RadioBrowserAPI();

const COUNTRIES = {
    'US': '🇺🇸 United States',
    'GB': '🇬🇧 United Kingdom',
    'EG': '🇪🇬 Egypt',
    'SA': '🇸🇦 Saudi Arabia',
    'AE': '🇦🇪 UAE',
    'DE': '🇩🇪 Germany',
    'FR': '🇫🇷 France',
    'JP': '🇯🇵 Japan',
    'KR': '🇰🇷 South Korea',
    'BR': '🇧🇷 Brazil',
    'MX': '🇲🇽 Mexico',
    'IN': '🇮🇳 India'
};

export default {
    data: new SlashCommandBuilder()
        .setName('liveradio')
        .setDescription('Play live internet radio stations from around the world')
        .addSubcommand(sub =>
            sub.setName('search')
                .setDescription('Search for radio stations')
                .addStringOption(option =>
                    option.setName('query')
                        .setDescription('Search query (station name, genre, etc.)')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('top')
                .setDescription('Browse top-rated radio stations')
        )
        .addSubcommand(sub =>
            sub.setName('country')
                .setDescription('Browse stations by country')
                .addStringOption(option =>
                    option.setName('code')
                        .setDescription('Country')
                        .setRequired(true)
                        .addChoices(
                            ...Object.entries(COUNTRIES).map(([code, name]) => ({
                                name,
                                value: code
                            }))
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('play')
                .setDescription('Play a station by URL')
                .addStringOption(option =>
                    option.setName('url')
                        .setDescription('Direct stream URL')
                        .setRequired(true)
                )
        ),
    
    category: 'music',
    aliases: ['internetradio', 'stations'],
    cooldown: 5,

    async execute(client, interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'search':
                return this.handleSearch(client, interaction);
            case 'top':
                return this.handleTop(client, interaction);
            case 'country':
                return this.handleCountry(client, interaction);
            case 'play':
                return this.handlePlay(client, interaction);
        }
    },

    async handleSearch(client, interaction) {
        const query = interaction.options.getString('query');
        await interaction.deferReply();

        try {
            const stations = await radioAPI.search(query, 15);

            if (stations.length === 0) {
                return interaction.editReply({
                    embeds: [errorEmbed(`No stations found for "${query}"`)]
                });
            }

            const embed = this.createStationsEmbed(
                `🔍 Radio Search: "${query}"`,
                stations,
                `Found ${stations.length} stations`
            );

            const components = this.createStationComponents(stations);

            this.cacheStations(client, interaction.user.id, stations);

            return interaction.editReply({ embeds: [embed], components });

        } catch (error) {
            client.logger.error('Live radio search error:', error);
            return interaction.editReply({
                embeds: [errorEmbed('Failed to search radio stations.')]
            });
        }
    },

    async handleTop(client, interaction) {
        await interaction.deferReply();

        try {
            const stations = await radioAPI.getTopStations(15);

            if (stations.length === 0) {
                return interaction.editReply({
                    embeds: [errorEmbed('Failed to fetch top stations.')]
                });
            }

            const embed = this.createStationsEmbed(
                '🏆 Top Rated Radio Stations',
                stations,
                'Most popular stations worldwide'
            );

            const components = this.createStationComponents(stations);
            this.cacheStations(client, interaction.user.id, stations);

            return interaction.editReply({ embeds: [embed], components });

        } catch (error) {
            client.logger.error('Live radio top error:', error);
            return interaction.editReply({
                embeds: [errorEmbed('Failed to fetch top stations.')]
            });
        }
    },

    async handleCountry(client, interaction) {
        const countryCode = interaction.options.getString('code');
        const countryName = COUNTRIES[countryCode] || countryCode;
        
        await interaction.deferReply();

        try {
            const stations = await radioAPI.getByCountry(countryCode, 15);

            if (stations.length === 0) {
                return interaction.editReply({
                    embeds: [errorEmbed(`No stations found in ${countryName}`)]
                });
            }

            const embed = this.createStationsEmbed(
                `${countryName} Radio Stations`,
                stations,
                `Popular stations in ${countryName.split(' ').slice(1).join(' ')}`
            );

            const components = this.createStationComponents(stations);
            this.cacheStations(client, interaction.user.id, stations);

            return interaction.editReply({ embeds: [embed], components });

        } catch (error) {
            client.logger.error('Live radio country error:', error);
            return interaction.editReply({
                embeds: [errorEmbed('Failed to fetch stations.')]
            });
        }
    },

    async handlePlay(client, interaction) {
        const url = interaction.options.getString('url');
        
        const validation = canUseMusic(interaction, client);
        if (!validation.valid) {
            return interaction.reply({
                embeds: [errorEmbed(validation.message)],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            await this.playStation(client, interaction, {
                name: 'Custom Station',
                url: url
            });
        } catch (error) {
            client.logger.error('Live radio play error:', error);
            return interaction.editReply({
                embeds: [errorEmbed('Failed to play radio station.')]
            });
        }
    },

    createStationsEmbed(title, stations, description) {
        return new EmbedBuilder()
            .setColor(Colors.primary)
            .setTitle(`📻 ${title}`)
            .setDescription(
                `${description}\n\n` +
                stations.slice(0, 10).map((station, i) => 
                    `**${i + 1}.** ${station.name}\n` +
                    `┗ 🌍 ${station.country || 'Unknown'} • ` +
                    `👍 ${station.votes || 0} votes` +
                    (station.bitrate ? ` • 📊 ${station.bitrate}kbps` : '')
                ).join('\n\n')
            )
            .setFooter({ text: 'Select a station to start streaming' })
            .setTimestamp();
    },

    createStationComponents(stations) {
        const selectOptions = stations.slice(0, 10).map((station, i) => ({
            label: this.truncate(station.name, 100),
            description: `${station.country || 'Unknown'} • ${station.votes || 0} votes`,
            value: i.toString(),
            emoji: '📻'
        }));

        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('liveradio_select')
                    .setPlaceholder('🎵 Select a station to play...')
                    .addOptions(selectOptions)
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('liveradio_refresh')
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄')
            );

        return [selectMenu, buttons];
    },

    cacheStations(client, userId, stations) {
        if (!client.radioCache) client.radioCache = new Map();
        client.radioCache.set(userId, {
            stations,
            timestamp: Date.now()
        });
    },

    async playStation(client, interaction, station, editReply = true) {
        const voiceChannel = interaction.member.voice.channel;
        
        if (!voiceChannel) {
            const msg = 'You need to be in a voice channel!';
            return editReply 
                ? interaction.editReply({ embeds: [errorEmbed(msg)] })
                : interaction.reply({ embeds: [errorEmbed(msg)], ephemeral: true });
        }

        const settings = client.db.getGuildSettings(interaction.guildId);

        try {
            const result = await client.kazagumo.search(station.url, {
                requester: interaction.user
            });

            if (!result.tracks.length) {
                const fallback = await client.kazagumo.search(`${station.name} radio live`, {
                    requester: interaction.user,
                    engine: 'youtube'
                });

                if (!fallback.tracks.length) {
                    return editReply
                        ? interaction.editReply({ embeds: [errorEmbed('Could not load this station.')] })
                        : interaction.reply({ embeds: [errorEmbed('Could not load this station.')], ephemeral: true });
                }

                result.tracks = fallback.tracks;
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

            player.queue.clear();
            player.queue.add(result.tracks[0]);

            if (!player.playing && !player.paused) {
                await player.play();
            } else {
                await player.skip();
            }

            const embed = new EmbedBuilder()
                .setColor(Colors.success)
                .setTitle(`📻 Now Streaming: ${station.name}`)
                .setDescription(
                    '🔴 **LIVE**\n\n' +
                    (station.country ? `🌍 **Country:** ${station.country}\n` : '') +
                    (station.tags ? `🏷️ **Tags:** ${station.tags}\n` : '') +
                    (station.bitrate ? `📊 **Bitrate:** ${station.bitrate}kbps` : '')
                )
                .setThumbnail(station.favicon || null)
                .setFooter({ text: 'Use /stop to end the stream' });

            return editReply
                ? interaction.editReply({ embeds: [embed], components: [] })
                : interaction.reply({ embeds: [embed] });

        } catch (error) {
            client.logger.error('Live radio playStation error:', error);
            throw error;
        }
    },

    truncate(str, length) {
        if (!str) return 'Unknown';
        return str.length > length ? str.substring(0, length - 3) + '...' : str;
    }
};
