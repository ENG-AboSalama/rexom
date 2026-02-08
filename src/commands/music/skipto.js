import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { canUseMusic, hasDJPermissions } from '../../utils/validators.js';
import { Colors, successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('skipto')
        .setDescription('Skip to a specific track in the queue')
        .addIntegerOption(option =>
            option.setName('position')
                .setDescription('Position of the track to skip to')
                .setRequired(true)
                .setMinValue(1)
        ),
    
    category: 'music',
    aliases: ['jump', 'jumpto'],
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
        
        if (!player || !player.queue.current) {
            return interaction.reply({
                embeds: [errorEmbed('There is no music playing.')],
                ephemeral: true
            });
        }

        const settings = client.db.getGuildSettings(interaction.guildId);
        if (settings.dj_role && !hasDJPermissions(interaction.member, settings)) {
            return interaction.reply({
                embeds: [errorEmbed('You need the DJ role to use this command.')],
                ephemeral: true
            });
        }

        const position = interaction.options.getInteger('position');

        if (position > player.queue.size) {
            return interaction.reply({
                embeds: [errorEmbed(`Invalid position. Queue only has ${player.queue.size} tracks.`)],
                ephemeral: true
            });
        }

        await interaction.deferReply();

        try {
            const targetTrack = player.queue[position - 1];
            
            for (let i = 0; i < position - 1; i++) {
                player.queue.shift();
            }
            
            await player.skip();

            const embed = new EmbedBuilder()
                .setColor(Colors.success)
                .setAuthor({ name: '⏭️ Skipped To Track' })
                .setDescription(`**[${targetTrack.title}](${targetTrack.uri})**`)
                .addFields(
                    { name: 'Artist', value: targetTrack.author || 'Unknown', inline: true },
                    { name: 'Position', value: `#${position}`, inline: true },
                    { name: 'Skipped', value: `${position - 1} tracks`, inline: true }
                )
                .setThumbnail(targetTrack.thumbnail || null)
                .setFooter({ text: `Requested by ${interaction.user.tag}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            client.logger.error('Skipto command error:', error);
            await interaction.editReply({
                embeds: [errorEmbed('Failed to skip to the track.')]
            });
        }
    }
};
