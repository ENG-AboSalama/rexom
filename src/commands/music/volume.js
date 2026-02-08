import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { canUseMusic, hasDJPermissions } from '../../utils/validators.js';
import { successEmbed, errorEmbed, Colors } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Adjust the playback volume')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Volume level (0-150)')
                .setMinValue(0)
                .setMaxValue(150)
                .setRequired(false)
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

        if (!player) {
            return interaction.reply({
                embeds: [errorEmbed('No music is currently playing.')],
                ephemeral: true
            });
        }

        const level = interaction.options.getInteger('level');
        const settings = client.db.getGuildSettings(interaction.guildId);

        if (level === null) {
            const volumeBar = createVolumeBar(player.volume);
            
            const embed = new EmbedBuilder()
                .setColor(Colors.primary)
                .setDescription(`🔊 **Current Volume:** ${player.volume}%\n${volumeBar}`);

            return interaction.reply({ embeds: [embed] });
        }

        const maxVolume = settings.max_volume || 150;
        
        if (level > maxVolume) {
            return interaction.reply({
                embeds: [errorEmbed(`Volume cannot exceed ${maxVolume}% on this server.`)],
                ephemeral: true
            });
        }

        if (level > 100) {
            const isDJ = hasDJPermissions(interaction.member, settings);
            if (!isDJ) {
                return interaction.reply({
                    embeds: [errorEmbed('You need DJ permissions to set volume above 100%.')],
                    ephemeral: true
                });
            }
        }

        const oldVolume = player.volume;
        player.setVolume(level);

        const volumeBar = createVolumeBar(level);
        const emoji = level === 0 ? '🔇' : level < 50 ? '🔉' : '🔊';

        await interaction.reply({
            embeds: [successEmbed(`${emoji} Volume: ${oldVolume}% → **${level}%**\n${volumeBar}`)]
        });
    }
};

function createVolumeBar(volume) {
    const filled = Math.round((volume / 150) * 15);
    const empty = 15 - filled;
    
    return '`[' + '█'.repeat(filled) + '░'.repeat(empty) + ']`';
}
