import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { Colors, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('View recently played tracks')
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of tracks to show (default: 10)')
                .setRequired(false)
                .setMinValue(5)
                .setMaxValue(50)
        )
        .addStringOption(option =>
            option.setName('scope')
                .setDescription('Show history for current session or all time')
                .setRequired(false)
                .addChoices(
                    { name: '📍 Current Session', value: 'session' },
                    { name: '📊 Server History', value: 'server' },
                    { name: '👤 My History', value: 'user' }
                )
        ),
    
    category: 'music',
    aliases: ['recent', 'played'],
    cooldown: 5,

    async execute(client, interaction) {
        await interaction.deferReply();

        const limit = interaction.options.getInteger('limit') || 10;
        const scope = interaction.options.getString('scope') || 'session';

        let history = [];
        let title = '';

        if (scope === 'session') {
            const player = client.kazagumo.players.get(interaction.guildId);
            history = player?.data.get('history') || [];
            title = '📍 Current Session History';
        } else if (scope === 'server') {
            history = client.db.getServerHistory(interaction.guildId, limit);
            title = '📊 Server Play History';
        } else {
            history = client.db.getUserHistory(interaction.user.id, limit);
            title = '👤 Your Play History';
        }

        if (history.length === 0) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.warning)
                        .setDescription('📭 No play history found.')
                ]
            });
        }

        const displayHistory = history.slice(0, limit);

        const embed = new EmbedBuilder()
            .setColor(Colors.primary)
            .setAuthor({ 
                name: title,
                iconURL: interaction.guild.iconURL()
            })
            .setDescription(
                displayHistory.map((track, index) => {
                    const duration = formatDuration(track.duration || track.length);
                    const timeAgo = track.playedAt ? `<t:${Math.floor(track.playedAt / 1000)}:R>` : '';
                    return `**${index + 1}.** [${truncate(track.title, 40)}](${track.uri})\n` +
                           `┗ ${track.author || 'Unknown'} • ${duration} ${timeAgo}`;
                }).join('\n\n')
            )
            .setFooter({ text: `Showing ${displayHistory.length} of ${history.length} tracks` })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('history_play_all')
                    .setLabel('Play All')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('▶️'),
                new ButtonBuilder()
                    .setCustomId('history_shuffle_play')
                    .setLabel('Shuffle Play')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔀'),
                new ButtonBuilder()
                    .setCustomId('history_clear')
                    .setLabel('Clear History')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('🗑️')
            );

        const selectMenu = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('history_select')
                    .setPlaceholder('🎵 Quick play a track...')
                    .addOptions(
                        displayHistory.slice(0, 25).map((track, index) => ({
                            label: truncate(track.title, 100),
                            description: truncate(track.author || 'Unknown Artist', 100),
                            value: `history_${index}_${track.uri?.substring(0, 80) || index}`,
                            emoji: getSourceEmoji(track.uri)
                        }))
                    )
            );

        await interaction.editReply({ 
            embeds: [embed], 
            components: [selectMenu, row] 
        });
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

function getSourceEmoji(uri) {
    if (!uri) return '🎵';
    if (uri.includes('youtube.com') || uri.includes('youtu.be')) return '🔴';
    if (uri.includes('spotify.com')) return '🟢';
    if (uri.includes('soundcloud.com')) return '🟠';
    return '🎵';
}
