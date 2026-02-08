import { canUseMusic } from '../../utils/validators.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { AudioEffectsManager } from '../../utils/audio-effects.js';

export default {
    customId: 'preset_clear',
    
    async execute(client, interaction) {
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

        await interaction.deferReply();

        const success = await client.audioEffects.clearEffects(player);

        if (!success) {
            return interaction.editReply({
                embeds: [errorEmbed('Failed to clear audio effects.')]
            });
        }

        return interaction.editReply({
            embeds: [successEmbed('✅ All audio effects have been cleared.')]
        });
    }
};
