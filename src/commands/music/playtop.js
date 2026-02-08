import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { canUseMusic, isValidURL } from '../../utils/validators.js';
import { successEmbed, errorEmbed, Colors } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('playtop')
        .setDescription('Add a song to the top of the queue')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name or URL')
                .setRequired(true)
                .setAutocomplete(true)
        ),
    
    category: 'music',
    aliases: ['pt', 'addtop'],
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
        const voiceChannel = interaction.member.voice.channel;
        const settings = client.db.getGuildSettings(interaction.guildId);

        try {
            const searchEngine = isValidURL(query) ? null : 'youtube';

            const result = await client.kazagumo.search(query, {
                requester: interaction.user,
                engine: searchEngine
            });

            if (!result.tracks.length) {
                return interaction.editReply({
                    embeds: [errorEmbed('No results found for your query.')]
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

            const track = result.tracks[0];
            
            player.queue.unshift(track);

            const embed = new EmbedBuilder()
                .setColor(Colors.success)
                .setAuthor({ 
                    name: '⬆️ Added to Top of Queue',
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setDescription(`**[${track.title}](${track.uri})**`)
                .addFields(
                    { name: 'Duration', value: formatDuration(track.length), inline: true },
                    { name: 'Artist', value: track.author || 'Unknown', inline: true },
                    { name: 'Position', value: 'Next up', inline: true }
                )
                .setThumbnail(track.thumbnail)
                .setFooter({ text: `Requested by ${interaction.user.username}` });

            if (!player.playing && !player.paused) {
                await player.play();
            }

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            client.logger.error('Playtop command error:', error);
            return interaction.editReply({
                embeds: [errorEmbed('Failed to add the track.')]
            });
        }
    },

    async autocomplete(client, interaction) {
        const focused = interaction.options.getFocused();
        
        if (!focused || focused.length < 2) {
            return interaction.respond([]);
        }

        try {
            const result = await client.kazagumo.search(focused, { engine: 'youtube' });
            
            const choices = result.tracks.slice(0, 10).map(track => ({
                name: `${track.title} - ${track.author}`.substring(0, 100),
                value: track.uri
            }));

            await interaction.respond(choices);
        } catch {
            await interaction.respond([]);
        }
    }
};

function formatDuration(ms) {
    if (!ms || ms === 0) return 'Live';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
