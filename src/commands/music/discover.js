import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { canUseMusic } from '../../utils/validators.js';
import { Colors, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('discover')
        .setDescription('Get AI-powered music recommendations based on your listening history')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of recommendations')
                .setRequired(false)
                .addChoices(
                    { name: '🎯 Personal - Based on your history', value: 'personal' },
                    { name: '🔥 Trending - Popular songs right now', value: 'trending' },
                    { name: '😊 Happy - Upbeat & cheerful', value: 'happy' },
                    { name: '😢 Sad - Emotional songs', value: 'sad' },
                    { name: '⚡ Energetic - High energy', value: 'energetic' },
                    { name: '😌 Chill - Relaxing vibes', value: 'chill' },
                    { name: '💕 Romantic - Love songs', value: 'romantic' },
                    { name: '🎉 Party - Dance hits', value: 'party' },
                    { name: '📚 Focus - Concentration music', value: 'focus' },
                    { name: '😴 Sleep - Calming sleep music', value: 'sleep' }
                )
        )
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('Number of recommendations (default: 10)')
                .setRequired(false)
                .setMinValue(5)
                .setMaxValue(20)
        ),
    
    category: 'music',
    aliases: ['foryou', 'personalized', 'ai'],
    cooldown: 15,

    async execute(client, interaction) {
        const validation = canUseMusic(interaction, client);
        if (!validation.valid) {
            return interaction.reply({
                embeds: [errorEmbed(validation.message)],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const type = interaction.options.getString('type') || 'personal';
        const count = interaction.options.getInteger('count') || 10;

        try {
            let tracks = [];
            let title = '';
            let description = '';
            let analysis = null;

            switch (type) {
                case 'personal': {
                    const result = await client.aiRecommendations.getPersonalRecommendations(
                        interaction.user.id,
                        interaction.guildId,
                        count
                    );
                    tracks = result.tracks;
                    analysis = result.analysis;
                    title = '🎯 Your Personalized Mix';
                    description = analysis?.topArtists?.length 
                        ? `Based on your love for **${analysis.topArtists.slice(0, 3).map(a => a.name).join('**, **')}** and more!`
                        : 'Curated just for you based on your listening history';
                    break;
                }

                case 'trending': {
                    tracks = await client.aiRecommendations.getTrendingTracks('global', count);
                    title = '🔥 Trending Now';
                    description = 'The hottest tracks right now';
                    break;
                }

                default: {
                    tracks = await client.aiRecommendations.getMoodBasedRecommendations(type, count);
                    const moodEmojis = {
                        happy: '😊', sad: '😢', energetic: '⚡', chill: '😌',
                        romantic: '💕', party: '🎉', focus: '📚', sleep: '😴'
                    };
                    title = `${moodEmojis[type] || '🎵'} ${type.charAt(0).toUpperCase() + type.slice(1)} Vibes`;
                    description = `Perfect ${type} music curated for you`;
                    break;
                }
            }

            if (tracks.length === 0) {
                return interaction.editReply({
                    embeds: [errorEmbed(
                        type === 'personal' 
                            ? 'Not enough listening history yet! Play some music first.'
                            : 'Could not find recommendations. Try again later.'
                    )]
                });
            }

            const embed = new EmbedBuilder()
                .setColor(Colors.primary)
                .setAuthor({ 
                    name: title,
                    iconURL: client.user.displayAvatarURL()
                })
                .setDescription(
                    `${description}\n\n` +
                    tracks.slice(0, 10).map((track, i) => 
                        `**${i + 1}.** [${truncate(track.title, 50)}](${track.uri})\n` +
                        `┗ 👤 ${truncate(track.author, 30)} • ⏱️ ${formatDuration(track.length)}`
                    ).join('\n\n')
                )
                .setThumbnail(tracks[0]?.thumbnail || null)
                .setFooter({ 
                    text: `💡 Tip: Use /discover with different moods • ${tracks.length} tracks found` 
                })
                .setTimestamp();

            if (analysis?.topArtists?.length) {
                embed.addFields({
                    name: '📊 Your Top Artists',
                    value: analysis.topArtists.slice(0, 5).map((a, i) => 
                        `${['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]} ${a.name} (${a.count} plays)`
                    ).join('\n'),
                    inline: true
                });
            }

            if (analysis?.genres?.length) {
                embed.addFields({
                    name: '🎸 Detected Genres',
                    value: analysis.genres.slice(0, 5).map(g => 
                        `• ${g.name.charAt(0).toUpperCase() + g.name.slice(1)}`
                    ).join('\n'),
                    inline: true
                });
            }

            const selectOptions = tracks.slice(0, 10).map((track, i) => ({
                label: truncate(track.title, 100),
                description: `${truncate(track.author, 50)} • ${formatDuration(track.length)}`,
                value: track.uri,
                emoji: ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][i]
            }));

            const selectMenu = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('discover_select')
                        .setPlaceholder('🎵 Select tracks to add to queue...')
                        .setMinValues(1)
                        .setMaxValues(Math.min(10, tracks.length))
                        .addOptions(selectOptions)
                );

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('discover_add_all')
                        .setLabel('Add All')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('➕'),
                    new ButtonBuilder()
                        .setCustomId('discover_shuffle_all')
                        .setLabel('Shuffle & Add')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔀'),
                    new ButtonBuilder()
                        .setCustomId('discover_refresh')
                        .setLabel('Refresh')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔄'),
                    new ButtonBuilder()
                        .setCustomId('discover_create_playlist')
                        .setLabel('Save as Playlist')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('💾')
                );

            const player = client.kazagumo.players.get(interaction.guildId);
            if (player) {
                player.data.set('discoverTracks', tracks);
                player.data.set('discoverType', type);
            }

            if (!client.discoverCache) client.discoverCache = new Map();
            client.discoverCache.set(interaction.user.id, {
                tracks,
                type,
                guildId: interaction.guildId,
                timestamp: Date.now()
            });

            await interaction.editReply({
                embeds: [embed],
                components: [selectMenu, buttons]
            });

        } catch (error) {
            client.logger.error('Discover command error:', error);
            await interaction.editReply({
                embeds: [errorEmbed('Failed to generate recommendations. Please try again.')]
            });
        }
    }
};

function formatDuration(ms) {
    if (!ms || ms === 0) return 'Live';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function truncate(str, length) {
    if (!str) return 'Unknown';
    return str.length > length ? str.substring(0, length - 3) + '...' : str;
}
