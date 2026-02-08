import { canUseMusic } from '../../utils/validators.js';
import { successEmbed, errorEmbed, Colors } from '../../utils/embeds.js';
import { AUDIO_PRESETS, AudioEffectsManager } from '../../utils/audio-effects.js';
import { EmbedBuilder } from 'discord.js';

export default {
    customId: 'preset_select',
    
    async execute(client, interaction) {
        const presetName = interaction.values[0];
        
        if (!client.audioEffects) {
            client.audioEffects = new AudioEffectsManager(client);
        }
        
        const validation = canUseMusic(interaction, client);
        if (!validation.valid) {
            return interaction.reply({
                embeds: [errorEmbed(validation.message)],
                ephemeral: true
            });
        }

        const player = client.kazagumo.players.get(interaction.guildId);
        if (!player?.queue.current) {
            return interaction.reply({
                embeds: [errorEmbed('Nothing is playing!')],
                ephemeral: true
            });
        }

        const preset = AUDIO_PRESETS[presetName];
        if (!preset) {
            return interaction.reply({
                embeds: [errorEmbed('Invalid preset selected!')],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        const success = await client.audioEffects.applyPreset(player, presetName);

        if (!success) {
            return interaction.editReply({
                embeds: [errorEmbed('Failed to apply audio preset.')]
            });
        }

        const embed = new EmbedBuilder()
            .setColor(Colors.success)
            .setTitle(`${preset.emoji} Preset Applied: ${preset.name}`)
            .setDescription(
                `${preset.description}\n\n` +
                `Use \`/preset action:clear\` to remove all effects.`
            )
            .setFooter({ text: `Requested by ${interaction.user.tag}` })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    }
};
