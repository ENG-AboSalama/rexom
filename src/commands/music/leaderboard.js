import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Colors } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View top music listeners')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Leaderboard type')
                .setRequired(false)
                .addChoices(
                    { name: '🎵 Most Songs Played', value: 'songs' },
                    { name: '⏱️ Most Time Listened', value: 'time' },
                    { name: '📋 Most Playlists Created', value: 'playlists' },
                    { name: '❤️ Most Favorites', value: 'favorites' }
                )
        )
        .addStringOption(option =>
            option.setName('scope')
                .setDescription('Leaderboard scope')
                .setRequired(false)
                .addChoices(
                    { name: '🏠 This Server', value: 'server' },
                    { name: '🌍 Global', value: 'global' }
                )
        ),
    
    category: 'music',
    aliases: ['lb', 'top', 'ranking'],
    cooldown: 10,

    async execute(client, interaction) {
        await interaction.deferReply();

        const type = interaction.options.getString('type') || 'songs';
        const scope = interaction.options.getString('scope') || 'server';

        try {
            let leaderboard;
            let title;
            let emoji;
            let valueFormat;

            switch (type) {
                case 'songs':
                    leaderboard = client.db.getLeaderboard('songs_played', scope === 'server' ? interaction.guildId : null, 10);
                    title = 'Most Songs Played';
                    emoji = '🎵';
                    valueFormat = (v) => `${v.toLocaleString()} songs`;
                    break;
                case 'time':
                    leaderboard = client.db.getLeaderboard('time_listened', scope === 'server' ? interaction.guildId : null, 10);
                    title = 'Most Time Listened';
                    emoji = '⏱️';
                    valueFormat = (v) => formatListenTime(v);
                    break;
                case 'playlists':
                    leaderboard = client.db.getLeaderboard('playlists', scope === 'server' ? interaction.guildId : null, 10);
                    title = 'Most Playlists Created';
                    emoji = '📋';
                    valueFormat = (v) => `${v} playlists`;
                    break;
                case 'favorites':
                    leaderboard = client.db.getLeaderboard('favorites', scope === 'server' ? interaction.guildId : null, 10);
                    title = 'Most Favorites';
                    emoji = '❤️';
                    valueFormat = (v) => `${v} favorites`;
                    break;
            }

            if (!leaderboard || leaderboard.length === 0) {
                leaderboard = await generateSampleLeaderboard(client, interaction, type);
            }

            if (!leaderboard || leaderboard.length === 0) {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.warning)
                            .setDescription('📭 No leaderboard data available yet. Start playing some music!')
                    ]
                });
            }

            const medals = ['🥇', '🥈', '🥉'];
            
            const embed = new EmbedBuilder()
                .setColor(Colors.primary)
                .setAuthor({
                    name: `${emoji} ${title} Leaderboard`,
                    iconURL: scope === 'server' ? interaction.guild.iconURL() : client.user.displayAvatarURL()
                })
                .setDescription(
                    leaderboard.map((entry, index) => {
                        const medal = medals[index] || `**${index + 1}.**`;
                        const isCurrentUser = entry.userId === interaction.user.id;
                        const highlight = isCurrentUser ? '**' : '';
                        return `${medal} ${highlight}<@${entry.userId}>${highlight}\n` +
                               `┗ ${valueFormat(entry.value)}`;
                    }).join('\n\n')
                )
                .setFooter({ 
                    text: `${scope === 'server' ? interaction.guild.name : 'Global'} • Updated just now`
                })
                .setTimestamp();

            const userRank = leaderboard.findIndex(e => e.userId === interaction.user.id);
            if (userRank === -1) {
                embed.addFields({
                    name: '📊 Your Ranking',
                    value: 'You\'re not on the leaderboard yet. Keep listening!',
                    inline: false
                });
            } else {
                embed.addFields({
                    name: '📊 Your Ranking',
                    value: `You are ranked **#${userRank + 1}** with ${valueFormat(leaderboard[userRank].value)}`,
                    inline: false
                });
            }

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('lb_songs')
                        .setLabel('Songs')
                        .setStyle(type === 'songs' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setEmoji('🎵'),
                    new ButtonBuilder()
                        .setCustomId('lb_time')
                        .setLabel('Time')
                        .setStyle(type === 'time' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setEmoji('⏱️'),
                    new ButtonBuilder()
                        .setCustomId('lb_playlists')
                        .setLabel('Playlists')
                        .setStyle(type === 'playlists' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setEmoji('📋'),
                    new ButtonBuilder()
                        .setCustomId('lb_favorites')
                        .setLabel('Favorites')
                        .setStyle(type === 'favorites' ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        .setEmoji('❤️')
                );

            const scopeButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('lb_server')
                        .setLabel('Server')
                        .setStyle(scope === 'server' ? ButtonStyle.Success : ButtonStyle.Secondary)
                        .setEmoji('🏠'),
                    new ButtonBuilder()
                        .setCustomId('lb_global')
                        .setLabel('Global')
                        .setStyle(scope === 'global' ? ButtonStyle.Success : ButtonStyle.Secondary)
                        .setEmoji('🌍')
                );

            await interaction.editReply({
                embeds: [embed],
                components: [buttons, scopeButtons]
            });

        } catch (error) {
            client.logger.error('Leaderboard command error:', error);
            await interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor(Colors.error)
                        .setDescription('❌ Failed to load leaderboard.')
                ]
            });
        }
    }
};

async function generateSampleLeaderboard(client, interaction, type) {
    const stats = client.db.getStatistics(interaction.guildId);
    
    if (!stats || Object.keys(stats).length === 0) {
        return [];
    }

    return Object.entries(stats)
        .map(([userId, data]) => ({
            userId,
            value: data[type] || 0
        }))
        .filter(e => e.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
}

function formatListenTime(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes} minutes`;
}
