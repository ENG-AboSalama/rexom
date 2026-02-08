import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { canUseMusic } from '../../utils/validators.js';
import { Colors, errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('recommend')
        .setDescription('Get song recommendations based on current track or query')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Base song/artist for recommendations (uses current track if empty)')
                .setRequired(false)
                .setAutocomplete(true)
        )
        .addIntegerOption(option =>
            option.setName('count')
                .setDescription('Number of recommendations (default: 5)')
                .setRequired(false)
                .setMinValue(3)
                .setMaxValue(10)
        ),
    
    category: 'music',
    aliases: ['similar', 'related'],
    cooldown: 10,

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
        const count = interaction.options.getInteger('count') || 5;
        const player = client.kazagumo.players.get(interaction.guildId);

        let searchQuery;

        if (query) {
            searchQuery = query;
        } else if (player?.queue.current) {
            const current = player.queue.current;
            searchQuery = `${current.author} ${current.title}`.replace(/\(.*?\)|\[.*?\]/g, '').trim();
        } else {
            return interaction.editReply({
                embeds: [errorEmbed('Please provide a query or play a song first.')]
            });
        }

        try {
            const results = await client.kazagumo.search(`${searchQuery} mix`, {
                requester: interaction.user,
                engine: 'youtube'
            });

            if (!results.tracks.length) {
                return interaction.editReply({
                    embeds: [errorEmbed('Could not find recommendations for this track.')]
                });
            }

            const currentUri = player?.queue.current?.uri;
            const recommendations = results.tracks
                .filter(t => t.uri !== currentUri)
                .slice(0, count);

            if (recommendations.length === 0) {
                return interaction.editReply({
                    embeds: [errorEmbed('No recommendations found.')]
                });
            }

            const embed = new EmbedBuilder()
                .setColor(Colors.primary)
                .setAuthor({ 
                    name: '🎯 Recommended Tracks',
                    iconURL: client.user.displayAvatarURL()
                })
                .setDescription(
                    `Based on: **${query || player?.queue.current?.title}**\n\n` +
                    recommendations.map((track, i) => 
                        `**${i + 1}.** [${track.title}](${track.uri})\n` +
                        `┗ ${track.author} • ${formatDuration(track.length)}`
                    ).join('\n\n')
                )
                .setThumbnail(recommendations[0]?.thumbnail || null)
                .setFooter({ text: 'Select a track to add to queue' })
                .setTimestamp();

            const selectMenu = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('recommend_select')
                        .setPlaceholder('🎵 Select tracks to add...')
                        .setMinValues(1)
                        .setMaxValues(recommendations.length)
                        .addOptions(
                            recommendations.map((track, i) => ({
                                label: truncate(track.title, 100),
                                description: `${track.author} • ${formatDuration(track.length)}`,
                                value: track.uri,
                                emoji: '🎵'
                            }))
                        )
                );

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('recommend_add_all')
                        .setLabel('Add All to Queue')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('➕'),
                    new ButtonBuilder()
                        .setCustomId('recommend_refresh')
                        .setLabel('Get More')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔄')
                );

            if (player) {
                player.data.set('recommendations', recommendations);
            }

            await interaction.editReply({
                embeds: [embed],
                components: [selectMenu, buttons]
            });

        } catch (error) {
            client.logger.error('Recommend command error:', error);
            await interaction.editReply({
                embeds: [errorEmbed('Failed to get recommendations.')]
            });
        }
    },

    async autocomplete(client, interaction) {
        const focused = interaction.options.getFocused();
        
        if (!focused) {
            return interaction.respond([]);
        }

        try {
            const result = await client.kazagumo.search(focused, {
                requester: interaction.user,
                engine: 'youtube'
            });

            const choices = result.tracks.slice(0, 10).map(track => ({
                name: truncate(`${track.title} - ${track.author}`, 100),
                value: truncate(track.title, 100)
            }));

            await interaction.respond(choices);
        } catch {
            await interaction.respond([]);
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
