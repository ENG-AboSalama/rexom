import { SlashCommandBuilder } from 'discord.js';
import { canUseMusic } from '../../utils/validators.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('replay')
        .setDescription('Restart the current track from the beginning'),
    
    aliases: ['restart'],
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
                embeds: [errorEmbed('This track cannot be restarted.')],
                ephemeral: true
            });
        }

        player.seek(0);

        await interaction.reply({
            embeds: [successEmbed(`🔄 Restarted **${track.title}**`)]
        });
    }
};
