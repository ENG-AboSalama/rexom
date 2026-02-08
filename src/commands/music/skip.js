import { SlashCommandBuilder } from 'discord.js';
import { canUseMusic, hasDJPermissions } from '../../utils/validators.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current track')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of tracks to skip')
                .setMinValue(1)
                .setMaxValue(100)
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

        if (!player || !player.queue.current) {
            return interaction.reply({
                embeds: [errorEmbed('No music is currently playing.')],
                ephemeral: true
            });
        }

        const amount = interaction.options.getInteger('amount') || 1;

        const settings = client.db.getGuildSettings(interaction.guildId);

        if (amount > 1) {
            const isDJ = hasDJPermissions(interaction.member, settings);
            if (!isDJ) {
                return interaction.reply({
                    embeds: [errorEmbed('You need DJ permissions to skip multiple tracks.')],
                    ephemeral: true
                });
            }
        }
        
        if (settings.vote_skip && amount === 1) {
            return handleVoteSkip(client, interaction, player, settings);
        }

        const currentTrack = player.queue.current;

        if (amount > 1 && player.queue.size >= amount - 1) {
            for (let i = 0; i < amount - 1; i++) {
                player.queue.shift();
            }
        }

        player.skip();

        await interaction.reply({
            embeds: [successEmbed(`⏭️ Skipped **${currentTrack.title}**` + 
                (amount > 1 ? ` and ${amount - 1} more tracks` : ''))]
        });
    }
};

async function handleVoteSkip(client, interaction, player, settings) {
    const voiceChannel = interaction.member.voice.channel;
    const members = voiceChannel.members.filter(m => !m.user.bot);
    const required = Math.ceil(members.size * (settings.vote_skip_ratio || 0.5));

    if (!player.skipVotes) {
        player.skipVotes = new Set();
    }

    if (player.skipVotes.has(interaction.user.id)) {
        return interaction.reply({
            embeds: [errorEmbed('You have already voted to skip.')],
            ephemeral: true
        });
    }

    player.skipVotes.add(interaction.user.id);
    const votes = player.skipVotes.size;

    if (votes >= required) {
        const track = player.queue.current;
        player.skipVotes.clear();
        player.skip();

        await interaction.reply({
            embeds: [successEmbed(`⏭️ Vote passed! Skipped **${track.title}**`)]
        });
    } else {
        await interaction.reply({
            embeds: [successEmbed(`🗳️ Vote skip: **${votes}/${required}**\n` +
                `${required - votes} more vote(s) needed.`)]
        });
    }
}
