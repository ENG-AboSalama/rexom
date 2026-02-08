import { SlashCommandBuilder } from 'discord.js';
import { canUseMusic, hasDJPermissions } from '../../utils/validators.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear the entire queue'),
    
    category: 'music',
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
                embeds: [errorEmbed('No music is currently playing.')],
                ephemeral: true
            });
        }

        if (player.queue.size === 0) {
            return interaction.reply({
                embeds: [errorEmbed('The queue is already empty.')],
                ephemeral: true
            });
        }

        const settings = client.db.getGuildSettings(interaction.guildId);
        const isDJ = hasDJPermissions(interaction.member, settings);
        if (!isDJ) {
            return interaction.reply({
                embeds: [errorEmbed('You need DJ permissions to clear the queue.')],
                ephemeral: true
            });
        }

        const size = player.queue.size;
        player.queue.clear();

        await interaction.reply({
            embeds: [successEmbed(`🗑️ Cleared **${size}** tracks from the queue.`)]
        });
    }
};
