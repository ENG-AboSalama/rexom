import { SlashCommandBuilder } from 'discord.js';
import { canUseMusic, hasDJPermissions } from '../../utils/validators.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('move')
        .setDescription('Move a track to a different position in the queue')
        .addIntegerOption(option =>
            option.setName('from')
                .setDescription('Current position of the track')
                .setMinValue(1)
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('to')
                .setDescription('New position for the track')
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

        const from = interaction.options.getInteger('from');
        const to = interaction.options.getInteger('to');

        if (from > player.queue.size || to > player.queue.size) {
            return interaction.reply({
                embeds: [errorEmbed(`Invalid position. Queue only has ${player.queue.size} tracks.`)],
                ephemeral: true
            });
        }

        if (from === to) {
            return interaction.reply({
                embeds: [errorEmbed('Source and destination are the same.')],
                ephemeral: true
            });
        }

        const track = player.queue[from - 1];

        const isOwner = track.requester?.id === interaction.user.id;
        const settings = client.db.getGuildSettings(interaction.guildId);
        const isDJ = hasDJPermissions(interaction.member, settings);

        if (!isOwner && !isDJ) {
            return interaction.reply({
                embeds: [errorEmbed('You can only move tracks that you requested, unless you have DJ permissions.')],
                ephemeral: true
            });
        }

        player.queue.splice(from - 1, 1);
        player.queue.splice(to - 1, 0, track);

        await interaction.reply({
            embeds: [successEmbed(`📍 Moved **${track.title}** from #${from} to #${to}`)]
        });
    }
};
