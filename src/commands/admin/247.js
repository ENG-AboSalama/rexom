import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { canUseMusic } from '../../utils/validators.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('247')
        .setDescription('Toggle 24/7 mode - bot stays in voice channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    
    category: 'admin',
    cooldown: 10,

    async execute(client, interaction) {
        const settings = client.db.getGuildSettings(interaction.guildId);
        const enabled = !settings.mode_247;

        client.db.updateGuildSettings(interaction.guildId, { mode_247: enabled ? 1 : 0 });

        if (enabled && interaction.member.voice?.channel) {
            let player = client.kazagumo.players.get(interaction.guildId);
            
            if (!player) {
                player = await client.kazagumo.createPlayer({
                    guildId: interaction.guildId,
                    voiceId: interaction.member.voice.channel.id,
                    textId: interaction.channelId,
                    deaf: true,
                    volume: settings.default_volume || 100
                });
            }

            return interaction.reply({
                embeds: [successEmbed(
                    '🌙 **24/7 Mode Enabled**\n\n' +
                    'I will stay in the voice channel even when not playing music.\n' +
                    'Use this command again to disable.'
                )]
            });
        }

        if (enabled) {
            await interaction.reply({
                embeds: [successEmbed(
                    '🌙 **24/7 Mode Enabled**\n\n' +
                    'Join a voice channel and play music - I won\'t leave when the queue ends.'
                )]
            });
        } else {
            const player = client.kazagumo.players.get(interaction.guildId);
            if (player && !player.queue.current) {
                player.destroy();
            }

            await interaction.reply({
                embeds: [successEmbed(
                    '☀️ **24/7 Mode Disabled**\n\n' +
                    'I will now leave the voice channel when the queue ends.'
                )]
            });
        }
    }
};
