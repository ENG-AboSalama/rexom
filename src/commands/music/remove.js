import { SlashCommandBuilder } from 'discord.js';
import { canUseMusic, hasDJPermissions } from '../../utils/validators.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a track from the queue')
        .addIntegerOption(option =>
            option.setName('position')
                .setDescription('Position of the track (use /queue to see positions)')
                .setMinValue(1)
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

        const position = interaction.options.getInteger('position');

        if (position > player.queue.size) {
            return interaction.reply({
                embeds: [errorEmbed(`Invalid position. Queue only has ${player.queue.size} tracks.`)],
                ephemeral: true
            });
        }

        const track = player.queue[position - 1];

        const isOwner = track.requester?.id === interaction.user.id;
        const settings = client.db.getGuildSettings(interaction.guildId);
        const isDJ = hasDJPermissions(interaction.member, settings);

        if (!isOwner && !isDJ) {
            return interaction.reply({
                embeds: [errorEmbed('You can only remove tracks that you requested, unless you have DJ permissions.')],
                ephemeral: true
            });
        }

        player.queue.splice(position - 1, 1);

        await interaction.reply({
            embeds: [successEmbed(`🗑️ Removed **${track.title}** from position ${position}`)]
        });
    }
};
