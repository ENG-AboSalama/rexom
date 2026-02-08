import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { canUseMusic } from '../../utils/validators.js';
import { successEmbed, errorEmbed, Colors } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('voteskip')
        .setDescription('Vote to skip the current song'),
    
    category: 'music',
    aliases: ['vs'],
    cooldown: 5,

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
                embeds: [errorEmbed('No music is currently playing!')],
                ephemeral: true
            });
        }

        const voiceChannel = interaction.member.voice.channel;
        const members = voiceChannel.members.filter(m => !m.user.bot);
        const required = Math.ceil(members.size / 2);

        if (!player.data.get('skipVotes')) {
            player.data.set('skipVotes', new Set());
        }

        const votes = player.data.get('skipVotes');

        if (votes.has(interaction.user.id)) {
            return interaction.reply({
                embeds: [errorEmbed(`You already voted! (${votes.size}/${required})`)],
                ephemeral: true
            });
        }

        votes.add(interaction.user.id);

        if (votes.size >= required) {
            player.data.set('skipVotes', new Set());
            await player.skip();

            return interaction.reply({
                embeds: [successEmbed(`⏭️ Vote skip passed! (${votes.size}/${required})`)]
            });
        }

        const embed = new EmbedBuilder()
            .setColor(Colors.primary)
            .setTitle('⏭️ Vote Skip')
            .setDescription(`**${interaction.user.username}** voted to skip!`)
            .addFields(
                { name: 'Votes', value: `${votes.size}/${required}`, inline: true },
                { name: 'Need', value: `${required - votes.size} more`, inline: true }
            )
            .setFooter({ text: 'Use /voteskip to add your vote' });

        return interaction.reply({ embeds: [embed] });
    }
};
