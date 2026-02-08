import { SlashCommandBuilder } from 'discord.js';
import { canUseMusic } from '../../utils/validators.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('forward')
        .setDescription('Skip forward in the current track')
        .addIntegerOption(option =>
            option.setName('seconds')
                .setDescription('Number of seconds to skip forward (default: 10)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(300)
        ),
    
    category: 'music',
    aliases: ['ff', 'fwd'],
    cooldown: 2,

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
                embeds: [errorEmbed('No music is currently playing!')],
                ephemeral: true
            });
        }

        const track = player.queue.current;

        if (!track.isSeekable) {
            return interaction.reply({
                embeds: [errorEmbed('This track cannot be seeked!')],
                ephemeral: true
            });
        }

        const seconds = interaction.options.getInteger('seconds') || 10;
        const newPosition = player.position + (seconds * 1000);

        if (newPosition >= track.length) {
            return interaction.reply({
                embeds: [errorEmbed('Cannot forward past the end of the track!')],
                ephemeral: true
            });
        }

        await player.seek(newPosition);

        const formatTime = (ms) => {
            const s = Math.floor(ms / 1000);
            const m = Math.floor(s / 60);
            const sec = s % 60;
            return `${m}:${sec.toString().padStart(2, '0')}`;
        };

        return interaction.reply({
            embeds: [successEmbed(`⏩ Forwarded ${seconds}s → \`${formatTime(newPosition)}\``)]
        });
    }
};
