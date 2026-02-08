import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Colors, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('grab')
        .setDescription('Send the current track info to your DMs')
        .addBooleanOption(option =>
            option.setName('public')
                .setDescription('Show the grab in the channel instead of DM')
                .setRequired(false)
        ),
    
    category: 'music',
    aliases: ['save', 'dm'],
    cooldown: 5,

    async execute(client, interaction) {
        const player = client.kazagumo.players.get(interaction.guildId);
        
        if (!player || !player.queue.current) {
            return interaction.reply({
                embeds: [errorEmbed('There is no music playing.')],
                ephemeral: true
            });
        }

        const isPublic = interaction.options.getBoolean('public') || false;
        const track = player.queue.current;

        const embed = new EmbedBuilder()
            .setColor(Colors.primary)
            .setAuthor({ 
                name: '🎵 Grabbed Track',
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTitle(track.title)
            .setURL(track.uri)
            .setThumbnail(track.thumbnail || null)
            .addFields(
                { name: '👤 Artist', value: track.author || 'Unknown', inline: true },
                { name: '⏱️ Duration', value: formatDuration(track.length), inline: true },
                { name: '📡 Source', value: getSourceName(track.uri), inline: true },
                { name: '🎧 Requested By', value: track.requester?.tag || 'Unknown', inline: true },
                { name: '🏠 Server', value: interaction.guild.name, inline: true },
                { name: '📅 Grabbed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
            .setFooter({ text: `Rexom Music Bot • Best Audio Quality` })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Open Link')
                    .setStyle(ButtonStyle.Link)
                    .setURL(track.uri)
                    .setEmoji('🔗'),
                new ButtonBuilder()
                    .setLabel('Add to Favorites')
                    .setStyle(ButtonStyle.Primary)
                    .setCustomId(`grab_favorite_${track.uri}`)
                    .setEmoji('❤️')
            );

        if (isPublic) {
            await interaction.reply({ embeds: [embed], components: [row] });
        } else {
            try {
                await interaction.user.send({ embeds: [embed], components: [row] });
                await interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(Colors.success)
                            .setDescription('✅ Track info has been sent to your DMs!')
                    ],
                    ephemeral: true
                });
            } catch (error) {
                await interaction.reply({
                    embeds: [errorEmbed('Could not send DM. Please check your privacy settings.')],
                    ephemeral: true
                });
            }
        }
    }
};

function formatDuration(ms) {
    if (!ms || ms === 0) return '🔴 Live';
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function getSourceName(uri) {
    if (!uri) return 'Unknown';
    if (uri.includes('youtube.com') || uri.includes('youtu.be')) return '🔴 YouTube';
    if (uri.includes('spotify.com')) return '🟢 Spotify';
    if (uri.includes('soundcloud.com')) return '🟠 SoundCloud';
    if (uri.includes('music.apple.com')) return '🍎 Apple Music';
    if (uri.includes('deezer.com')) return '💜 Deezer';
    return '🎵 Direct Link';
}
