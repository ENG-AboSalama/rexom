import { SlashCommandBuilder } from 'discord.js';
import { canUseMusic } from '../../utils/validators.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the current track'),
    
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

        if (player.paused) {
            return interaction.reply({
                embeds: [errorEmbed('The music is already paused. Use `/resume` to continue.')],
                ephemeral: true
            });
        }

        player.pause(true);

        await interaction.reply({
            embeds: [successEmbed(`⏸️ Paused **${player.queue.current.title}**`)]
        });
    }
};
