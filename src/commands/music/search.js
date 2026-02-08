import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { canUseMusic } from '../../utils/validators.js';
import { Colors, formatDuration, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search for tracks and select from results')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('What to search for')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('source')
                .setDescription('Search source')
                .setRequired(false)
                .addChoices(
                    { name: '🎵 YouTube', value: 'youtube' },
                    { name: '🎵 YouTube Music', value: 'youtube_music' },
                    { name: '☁️ SoundCloud', value: 'soundcloud' },
                    { name: '🟢 Spotify', value: 'spotify' }
                )
        ),
    
    category: 'music',
    cooldown: 5,

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
        const source = interaction.options.getString('source') || 'youtube';

        try {
            const result = await client.kazagumo.search(query, {
                requester: interaction.user,
                engine: source
            });

            if (!result.tracks.length) {
                return interaction.editReply({
                    embeds: [errorEmbed('No results found for your query.')]
                });
            }

            const tracks = result.tracks.slice(0, 10);

            const description = tracks.map((track, index) => 
                `**${index + 1}.** [${track.title}](${track.uri}) \`[${formatDuration(track.length)}]\`\n└ ${track.author}`
            ).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor(Colors.primary)
                .setAuthor({ name: `🔍 Search Results for: ${query}` })
                .setDescription(description)
                .setFooter({ text: 'Select a track from the menu below • Expires in 60s' });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('search_select')
                .setPlaceholder('Select a track to play...')
                .addOptions(tracks.map((track, index) => ({
                    label: track.title.substring(0, 100),
                    description: `${track.author} • ${formatDuration(track.length)}`.substring(0, 100),
                    value: index.toString(),
                    emoji: getNumberEmoji(index + 1)
                })));

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const response = await interaction.editReply({
                embeds: [embed],
                components: [row]
            });

            const collector = response.createMessageComponentCollector({
                time: 60000
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({
                        content: 'This search belongs to someone else.',
                        ephemeral: true
                    });
                }

                const selectedIndex = parseInt(i.values[0]);
                const selectedTrack = tracks[selectedIndex];

                let player = client.kazagumo.players.get(interaction.guildId);
                const settings = client.db.getGuildSettings(interaction.guildId);

                if (!player) {
                    player = await client.kazagumo.createPlayer({
                        guildId: interaction.guildId,
                        voiceId: interaction.member.voice.channel.id,
                        textId: interaction.channelId,
                        deaf: true,
                        volume: settings.default_volume || 100
                    });
                }

                player.queue.add(selectedTrack);

                if (!player.playing && !player.paused) {
                    await player.play();
                }

                const addedEmbed = new EmbedBuilder()
                    .setColor(Colors.success)
                    .setAuthor({ name: '🎵 Added to Queue', iconURL: interaction.user.displayAvatarURL() })
                    .setDescription(`**[${selectedTrack.title}](${selectedTrack.uri})**`)
                    .addFields(
                        { name: 'Duration', value: formatDuration(selectedTrack.length), inline: true },
                        { name: 'Position', value: `#${player.queue.size}`, inline: true }
                    )
                    .setThumbnail(selectedTrack.thumbnail)
                    .setFooter({ text: `Requested by ${interaction.user.username}` });

                await i.update({ embeds: [addedEmbed], components: [] });
                collector.stop();
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    try {
                        await response.edit({ components: [] });
                    } catch (e) {}
                }
            });

        } catch (error) {
            client.logger.error('Search error:', error);
            await interaction.editReply({
                embeds: [errorEmbed('Failed to search. Please try again.')]
            });
        }
    }
};

function getNumberEmoji(num) {
    const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
    return emojis[num - 1] || '🔢';
}
