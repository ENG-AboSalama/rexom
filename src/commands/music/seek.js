import { SlashCommandBuilder } from 'discord.js';
import { canUseMusic, parseTime } from '../../utils/validators.js';
import { successEmbed, errorEmbed, formatDuration } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('Seek to a position in the current track')
        .addStringOption(option =>
            option.setName('position')
                .setDescription('Position to seek (e.g., 1:30, 90s, 2m)')
                .setRequired(true)
        ),
    
    category: 'music',
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
                embeds: [errorEmbed('No music is currently playing.')],
                ephemeral: true
            });
        }

        const track = player.queue.current;

        if (!track.isSeekable) {
            return interaction.reply({
                embeds: [errorEmbed('This track cannot be seeked.')],
                ephemeral: true
            });
        }

        const positionStr = interaction.options.getString('position');
        const position = parseTime(positionStr);

        if (position === null || isNaN(position)) {
            return interaction.reply({
                embeds: [errorEmbed('Invalid time format. Use formats like: `1:30`, `90s`, `2m`, `1h30m`')],
                ephemeral: true
            });
        }

        if (position < 0) {
            return interaction.reply({
                embeds: [errorEmbed('Position cannot be negative.')],
                ephemeral: true
            });
        }

        if (position > track.length) {
            return interaction.reply({
                embeds: [errorEmbed(`Position cannot exceed track duration (${formatDuration(track.length)}).`)],
                ephemeral: true
            });
        }

        player.seek(position);

        await interaction.reply({
            embeds: [successEmbed(`⏩ Seeked to **${formatDuration(position)}**`)]
        });
    }
};
