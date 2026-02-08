import { SlashCommandBuilder } from 'discord.js';
import { canUseMusic } from '../../utils/validators.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the current queue'),
    
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

        if (player.queue.size < 2) {
            return interaction.reply({
                embeds: [errorEmbed('Need at least 2 tracks in queue to shuffle.')],
                ephemeral: true
            });
        }

        player.queue.shuffle();

        await interaction.reply({
            embeds: [successEmbed(`🔀 Shuffled **${player.queue.size}** tracks!`)]
        });
    }
};
