import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { canUseMusic, hasDJPermissions } from '../../utils/validators.js';
import { Colors, successEmbed, errorEmbed, createNowPlayingEmbed, createMusicButtons } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('previous')
        .setDescription('Play the previous track'),
    
    category: 'music',
    aliases: ['back', 'prev'],
    cooldown: 3,

    async execute(client, interaction) {
        const validation = canUseMusic(interaction, client);
        if (!validation.valid) {
            return interaction.reply({
                embeds: [errorEmbed(validation.message)],
                ephemeral: true
            });
        }

        const player = client.kazagumo.players.get(interaction.guildId);
        
        if (!player || !player.queue.current) {
            return interaction.reply({
                embeds: [errorEmbed('There is no music playing.')],
                ephemeral: true
            });
        }

        const settings = client.db.getGuildSettings(interaction.guildId);
        if (settings.dj_role && !hasDJPermissions(interaction.member, settings)) {
            return interaction.reply({
                embeds: [errorEmbed('You need the DJ role to use this command.')],
                ephemeral: true
            });
        }

        const history = player.data.get('history') || [];
        
        if (history.length === 0) {
            return interaction.reply({
                embeds: [errorEmbed('There is no previous track to play.')],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            const previousTrack = history.pop();
            player.data.set('history', history);

            if (player.queue.current) {
                player.queue.unshift(player.queue.current);
            }

            const result = await client.kazagumo.search(previousTrack.uri || previousTrack.title, {
                requester: interaction.user
            });

            if (!result.tracks.length) {
                return interaction.editReply({
                    embeds: [errorEmbed('Could not find the previous track.')]
                });
            }

            const track = result.tracks[0];
            
            player.queue.unshift(track);
            await player.skip();

            const embed = new EmbedBuilder()
                .setColor(Colors.success)
                .setAuthor({ name: '⏮️ Playing Previous Track' })
                .setDescription(`**[${track.title}](${track.uri})**`)
                .addFields(
                    { name: 'Artist', value: track.author || 'Unknown', inline: true },
                    { name: 'Duration', value: formatDuration(track.length), inline: true }
                )
                .setThumbnail(track.thumbnail || null)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ 
                embeds: [embed],
                components: [createMusicButtons(player)]
            });

        } catch (error) {
            client.logger.error('Previous command error:', error);
            await interaction.editReply({
                embeds: [errorEmbed('Failed to play the previous track.')]
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
