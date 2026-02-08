import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { canUseMusic } from '../../utils/validators.js';
import { successEmbed, errorEmbed, Colors } from '../../utils/embeds.js';

const RADIO_STATIONS = {
    lofi: {
        name: 'Lofi Hip Hop Radio',
        url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
        emoji: '🎹'
    },
    chill: {
        name: 'Chillhop Radio',
        url: 'https://www.youtube.com/watch?v=5yx6BWlEVcY',
        emoji: '☕'
    },
    jazz: {
        name: 'Jazz Radio',
        url: 'https://www.youtube.com/watch?v=Dx5qFachd3A',
        emoji: '🎷'
    },
    synthwave: {
        name: 'Synthwave Radio',
        url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
        emoji: '🌆'
    },
    classical: {
        name: 'Classical Piano Radio',
        url: 'https://www.youtube.com/watch?v=FRSu8hmv4FA',
        emoji: '🎻'
    },
    gaming: {
        name: 'Gaming Music Radio',
        url: 'https://www.youtube.com/watch?v=VVQgq5xKnEY',
        emoji: '🎮'
    },
    kpop: {
        name: 'K-Pop Radio',
        url: 'https://www.youtube.com/watch?v=1ZcR7YVSjGU',
        emoji: '🇰🇷'
    },
    anime: {
        name: 'Anime Music Radio',
        url: 'https://www.youtube.com/watch?v=WDXPJWIgX-o',
        emoji: '🎌'
    }
};

export default {
    data: new SlashCommandBuilder()
        .setName('radio')
        .setDescription('Play a 24/7 radio station')
        .addStringOption(option =>
            option.setName('station')
                .setDescription('Radio station to play')
                .setRequired(false)
                .addChoices(
                    ...Object.entries(RADIO_STATIONS).map(([key, station]) => ({
                        name: `${station.emoji} ${station.name}`,
                        value: key
                    }))
                )
        ),
    
    category: 'music',
    aliases: ['stream', 'live'],
    cooldown: 5,

    async execute(client, interaction) {
        const stationKey = interaction.options.getString('station');

        if (!stationKey) {
            const embed = new EmbedBuilder()
                .setColor(Colors.primary)
                .setTitle('📻 Radio Stations')
                .setDescription('Select a radio station to start streaming!')
                .addFields(
                    Object.entries(RADIO_STATIONS).map(([key, station]) => ({
                        name: `${station.emoji} ${station.name}`,
                        value: `\`/radio station:${key}\``,
                        inline: true
                    }))
                );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('radio_select')
                .setPlaceholder('Choose a radio station')
                .addOptions(
                    Object.entries(RADIO_STATIONS).map(([key, station]) => ({
                        label: station.name,
                        value: key,
                        emoji: station.emoji
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            return interaction.reply({ embeds: [embed], components: [row] });
        }

        const validation = canUseMusic(interaction, client);
        if (!validation.valid) {
            return interaction.reply({
                embeds: [errorEmbed(validation.message)],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const station = RADIO_STATIONS[stationKey];
        const voiceChannel = interaction.member.voice.channel;
        const settings = client.db.getGuildSettings(interaction.guildId);

        try {
            const result = await client.kazagumo.search(station.url, {
                requester: interaction.user
            });

            if (!result.tracks.length) {
                return interaction.editReply({
                    embeds: [errorEmbed('Failed to load radio station.')]
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

            player.queue.clear();
            player.queue.add(result.tracks[0]);

            if (!player.playing && !player.paused) {
                await player.play();
            } else {
                await player.skip();
            }

            player.setLoop('track');

            const embed = new EmbedBuilder()
                .setColor(Colors.success)
                .setTitle(`${station.emoji} Now Playing: ${station.name}`)
                .setDescription('🔴 **LIVE** - Radio is now streaming!')
                .setThumbnail(result.tracks[0].thumbnail)
                .setFooter({ text: 'Use /stop to end the stream' });

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            client.logger.error('Radio command error:', error);
            return interaction.editReply({
                embeds: [errorEmbed('Failed to start radio station.')]
            });
        }
    }
};
