import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { canUseMusic } from '../../utils/validators.js';
import { successEmbed, errorEmbed, Colors } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Set loop mode')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Loop mode')
                .setRequired(false)
                .addChoices(
                    { name: '➡️ Off', value: 'none' },
                    { name: '🔂 Track', value: 'track' },
                    { name: '🔁 Queue', value: 'queue' }
                )
        ),
    
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

        let mode = interaction.options.getString('mode');

        if (!mode) {
            const modes = ['none', 'track', 'queue'];
            const currentIndex = modes.indexOf(player.loop || 'none');
            mode = modes[(currentIndex + 1) % 3];
        }

        player.setLoop(mode);

        const modeInfo = {
            none: { emoji: '➡️', text: 'Loop disabled' },
            track: { emoji: '🔂', text: 'Looping current track' },
            queue: { emoji: '🔁', text: 'Looping entire queue' }
        };

        const info = modeInfo[mode];

        await interaction.reply({
            embeds: [successEmbed(`${info.emoji} ${info.text}`)]
        });
    }
};
