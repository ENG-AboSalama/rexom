import { SlashCommandBuilder } from 'discord.js';
import { canUseMusic } from '../../utils/validators.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('savequeue')
        .setDescription('Save the current queue as a playlist')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Name for the playlist')
                .setRequired(true)
                .setMaxLength(50)
        ),
    
    category: 'music',
    aliases: ['sq', 'exportqueue'],
    cooldown: 10,

    async execute(client, interaction) {
        const validation = canUseMusic(interaction, client);
        if (!validation.valid) {
            return interaction.reply({
                embeds: [errorEmbed(validation.message)],
                ephemeral: true
            });
        }

        const player = client.kazagumo.players.get(interaction.guildId);

        if (!player || (!player.queue.current && player.queue.size === 0)) {
            return interaction.reply({
                embeds: [errorEmbed('The queue is empty!')],
                ephemeral: true
            });
        }

        const name = interaction.options.getString('name');

        const existing = client.db.getPlaylist(interaction.user.id, name);
        if (existing) {
            return interaction.reply({
                embeds: [errorEmbed(`You already have a playlist named "${name}"!`)],
                ephemeral: true
            });
        }

        const tracks = [];
        
        if (player.queue.current) {
            tracks.push({
                title: player.queue.current.title,
                uri: player.queue.current.uri,
                author: player.queue.current.author,
                duration: player.queue.current.length,
                thumbnail: player.queue.current.thumbnail
            });
        }

        for (const track of player.queue) {
            tracks.push({
                title: track.title,
                uri: track.uri,
                author: track.author,
                duration: track.length,
                thumbnail: track.thumbnail
            });
        }

        try {
            client.db.createPlaylist(interaction.user.id, name, tracks);

            return interaction.reply({
                embeds: [successEmbed(`💾 Saved **${tracks.length}** tracks to playlist "${name}"`)]
            });

        } catch (error) {
            client.logger.error('Save queue error:', error);
            return interaction.reply({
                embeds: [errorEmbed('Failed to save the queue.')],
                ephemeral: true
            });
        }
    }
};
