import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Colors, formatDuration } from '../../utils/embeds.js';
import { errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Display the music queue')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number')
                .setMinValue(1)
                .setRequired(false)
        ),
    
    category: 'music',
    cooldown: 3,

    async execute(client, interaction) {
        const player = client.kazagumo.players.get(interaction.guildId);

        if (!player || !player.queue.current) {
            return interaction.reply({
                embeds: [errorEmbed('No music is currently playing.')],
                ephemeral: true
            });
        }

        const queue = player.queue;
        const current = queue.current;
        
        const tracksPerPage = 10;
        const totalPages = Math.max(1, Math.ceil(queue.size / tracksPerPage));
        let page = interaction.options.getInteger('page') || 1;
        page = Math.min(Math.max(1, page), totalPages);

        const embed = createQueueEmbed(player, page, tracksPerPage);
        const components = totalPages > 1 ? [createQueueButtons(page, totalPages)] : [];

        const response = await interaction.reply({ 
            embeds: [embed], 
            components,
            fetchReply: true 
        });

        if (totalPages > 1) {
            const collector = response.createMessageComponentCollector({
                time: 120000
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({
                        content: 'You cannot use these buttons.',
                        ephemeral: true
                    });
                }

                const action = i.customId;
                
                if (action === 'queue_first') page = 1;
                else if (action === 'queue_prev') page = Math.max(1, page - 1);
                else if (action === 'queue_next') page = Math.min(totalPages, page + 1);
                else if (action === 'queue_last') page = totalPages;

                const newEmbed = createQueueEmbed(player, page, tracksPerPage);
                const newComponents = [createQueueButtons(page, totalPages)];

                await i.update({ embeds: [newEmbed], components: newComponents });
            });

            collector.on('end', async () => {
                try {
                    await response.edit({ components: [] });
                } catch (e) {
                }
            });
        }
    }
};

function createQueueEmbed(player, page, tracksPerPage) {
    const queue = player.queue;
    const current = queue.current;

    let totalDuration = current.length || 0;
    queue.forEach(track => totalDuration += track.length || 0);

    let description = `**Now Playing:**\n` +
        `[${current.title}](${current.uri}) \`[${formatDuration(current.length)}]\`\n` +
        `Requested by: <@${current.requester?.id}>\n\n`;

    const position = player.position;
    const duration = current.length || 0;
    const progress = duration > 0 ? Math.floor((position / duration) * 15) : 0;
    const bar = '▬'.repeat(progress) + '🔘' + '▬'.repeat(15 - progress);
    description += `${formatDuration(position)} ${bar} ${formatDuration(duration)}\n\n`;

    if (queue.size > 0) {
        description += '**Up Next:**\n';
        
        const start = (page - 1) * tracksPerPage;
        const end = Math.min(start + tracksPerPage, queue.size);
        const tracks = [...queue].slice(start, end);

        tracks.forEach((track, index) => {
            const position = start + index + 1;
            description += `\`${position}.\` [${track.title}](${track.uri}) \`[${formatDuration(track.length)}]\`\n`;
        });
    } else {
        description += '*Queue is empty*';
    }

    const embed = new EmbedBuilder()
        .setColor(Colors.primary)
        .setAuthor({ name: '📋 Music Queue' })
        .setDescription(description)
        .setFooter({ 
            text: `${queue.size} tracks in queue • Total: ${formatDuration(totalDuration)} • Page ${page}/${Math.max(1, Math.ceil(queue.size / tracksPerPage))}` 
        });

    if (player.loop && player.loop !== 'none') {
        embed.addFields({
            name: '🔁 Loop Mode',
            value: player.loop === 'track' ? 'Track' : 'Queue',
            inline: true
        });
    }

    return embed;
}

function createQueueButtons(currentPage, totalPages) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('queue_first')
                .setEmoji('⏮️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 1),
            new ButtonBuilder()
                .setCustomId('queue_prev')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === 1),
            new ButtonBuilder()
                .setCustomId('queue_page')
                .setLabel(`${currentPage}/${totalPages}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('queue_next')
                .setEmoji('▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === totalPages),
            new ButtonBuilder()
                .setCustomId('queue_last')
                .setEmoji('⏭️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(currentPage === totalPages)
        );
}
