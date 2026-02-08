import { SlashCommandBuilder } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('join')
        .setDescription('Make the bot join your voice channel'),
    
    category: 'music',
    aliases: ['connect', 'summon'],
    cooldown: 3,

    async execute(client, interaction) {
        const voiceChannel = interaction.member.voice.channel;

        if (!voiceChannel) {
            return interaction.reply({
                embeds: [errorEmbed('You must be in a voice channel!')],
                ephemeral: true
            });
        }

        const permissions = voiceChannel.permissionsFor(interaction.guild.members.me);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return interaction.reply({
                embeds: [errorEmbed('I need permissions to join and speak in that channel!')],
                ephemeral: true
            });
        }

        try {
            let player = client.kazagumo.players.get(interaction.guildId);

            if (player) {
                if (player.voiceId === voiceChannel.id) {
                    return interaction.reply({
                        embeds: [errorEmbed('I\'m already in your voice channel!')],
                        ephemeral: true
                    });
                }

                await player.setVoiceChannel(voiceChannel.id);
                
                return interaction.reply({
                    embeds: [successEmbed(`📍 Moved to <#${voiceChannel.id}>`)]
                });
            }

            const settings = client.db.getGuildSettings(interaction.guildId);
            
            player = await client.kazagumo.createPlayer({
                guildId: interaction.guildId,
                voiceId: voiceChannel.id,
                textId: interaction.channelId,
                deaf: true,
                volume: settings.default_volume || 100
            });

            return interaction.reply({
                embeds: [successEmbed(`🎵 Joined <#${voiceChannel.id}>`)]
            });

        } catch (error) {
            client.logger.error('Join command error:', error);
            return interaction.reply({
                embeds: [errorEmbed('Failed to join the voice channel.')],
                ephemeral: true
            });
        }
    }
};
