import { SlashCommandBuilder } from 'discord.js';
import { canUseMusic } from '../../utils/validators.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('Toggle autoplay for related tracks'),
    
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

        if (!player) {
            return interaction.reply({
                embeds: [errorEmbed('No music is currently playing.')],
                ephemeral: true
            });
        }

        player.data.set('autoplay', !player.data.get('autoplay'));
        const enabled = player.data.get('autoplay');

        await interaction.reply({
            embeds: [successEmbed(enabled 
                ? '🔄 **Autoplay enabled** - Related tracks will be added when the queue ends.' 
                : '➡️ **Autoplay disabled** - Playback will stop when the queue ends.'
            )]
        });
    }
};
