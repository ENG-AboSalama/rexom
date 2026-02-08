import { SlashCommandBuilder } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Make the bot leave the voice channel'),
    
    category: 'music',
    aliases: ['disconnect', 'dc', 'bye'],
    cooldown: 3,

    async execute(client, interaction) {
        const player = client.kazagumo.players.get(interaction.guildId);

        if (!player) {
            return interaction.reply({
                embeds: [errorEmbed('I\'m not in a voice channel!')],
                ephemeral: true
            });
        }

        const voiceChannel = interaction.member.voice.channel;
        
        if (!voiceChannel || voiceChannel.id !== player.voiceId) {
            return interaction.reply({
                embeds: [errorEmbed('You must be in the same voice channel as me!')],
                ephemeral: true
            });
        }

        try {
            const channelId = player.voiceId;
            await player.destroy();

            return interaction.reply({
                embeds: [successEmbed(`👋 Left <#${channelId}>`)]
            });

        } catch (error) {
            client.logger.error('Leave command error:', error);
            return interaction.reply({
                embeds: [errorEmbed('Failed to leave the voice channel.')],
                ephemeral: true
            });
        }
    }
};
