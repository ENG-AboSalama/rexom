import { SlashCommandBuilder } from 'discord.js';
import { createNowPlayingEmbed, createMusicButtons, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show the currently playing track with controls'),
    
    aliases: ['np', 'current'],
    category: 'music',
    cooldown: 3,

    async execute(client, interaction) {
        const player = client.kazagumo.players.get(interaction.guildId);

        if (!player || !player.queue.current) {
            return interaction.reply({
                embeds: [errorEmbed('No music is currently playing.')],
                ephemeral: true
            });
        }

        const track = player.queue.current;
        const settings = client.db.getGuildSettings(interaction.guildId);
        
        const embed = createNowPlayingEmbed(track, player, settings.language || 'en');
        const buttons = createMusicButtons(player, settings.language || 'en');

        const response = await interaction.reply({
            embeds: [embed],
            components: [buttons],
            fetchReply: true
        });

        const updateInterval = setInterval(async () => {
            const currentPlayer = client.kazagumo.players.get(interaction.guildId);
            
            if (!currentPlayer || !currentPlayer.queue.current) {
                clearInterval(updateInterval);
                try {
                    await response.edit({ components: [] });
                } catch (e) {}
                return;
            }

            try {
                const updatedEmbed = createNowPlayingEmbed(currentPlayer.queue.current, currentPlayer, settings.language || 'en');
                const updatedButtons = createMusicButtons(currentPlayer, settings.language || 'en');
                await response.edit({ embeds: [updatedEmbed], components: [updatedButtons] });
            } catch (e) {
                clearInterval(updateInterval);
            }
        }, 5000);

        setTimeout(() => {
            clearInterval(updateInterval);
        }, 120000);
    }
};
