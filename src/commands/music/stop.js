import { SlashCommandBuilder } from 'discord.js';
import { canUseMusic, hasDJPermissions } from '../../utils/validators.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop playback, clear the queue, and leave'),
    
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

        const settings = client.db.getGuildSettings(interaction.guildId);
        
        if (settings.dj_only_stop) {
            const isDJ = hasDJPermissions(interaction.member, settings);
            if (!isDJ) {
                return interaction.reply({
                    embeds: [errorEmbed('You need DJ permissions to stop the music.')],
                    ephemeral: true
                });
            }
        }

        const queueSize = player.queue.size;
        player.destroy();

        await interaction.reply({
            embeds: [successEmbed(`⏹️ Stopped playback and cleared **${queueSize}** tracks.`)]
        });
    }
};
