import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Colors, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('lyrics')
        .setDescription('Get lyrics for the current or specified song')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name (leave empty for current track)')
                .setRequired(false)
        ),
    
    category: 'music',
    cooldown: 5,

    async execute(client, interaction) {
        await interaction.deferReply();

        let query = interaction.options.getString('query');

        if (!query) {
            const player = client.kazagumo.players.get(interaction.guildId);
            
            if (!player || !player.queue.current) {
                return interaction.editReply({
                    embeds: [errorEmbed('No music is playing. Provide a song name to search for lyrics.')]
                });
            }

            const track = player.queue.current;
            query = `${track.title} ${track.author}`.replace(/\(.*?\)|\[.*?\]/g, '').trim();
        }

        try {
            const lyrics = await fetchLyrics(query);

            if (!lyrics) {
                return interaction.editReply({
                    embeds: [errorEmbed(`No lyrics found for **${query}**.`)]
                });
            }

            const maxLength = 4000;
            const pages = [];
            
            if (lyrics.content.length <= maxLength) {
                pages.push(lyrics.content);
            } else {
                const parts = lyrics.content.split('\n\n');
                let currentPage = '';

                for (const part of parts) {
                    if ((currentPage + '\n\n' + part).length > maxLength) {
                        pages.push(currentPage.trim());
                        currentPage = part;
                    } else {
                        currentPage += (currentPage ? '\n\n' : '') + part;
                    }
                }
                if (currentPage) {
                    pages.push(currentPage.trim());
                }
            }

            let currentPageIndex = 0;

            const embed = new EmbedBuilder()
                .setColor(Colors.primary)
                .setAuthor({ name: '🎤 Lyrics' })
                .setTitle(lyrics.title)
                .setDescription(pages[0])
                .setFooter({ 
                    text: pages.length > 1 
                        ? `Page ${currentPageIndex + 1}/${pages.length} • Source: ${lyrics.source}` 
                        : `Source: ${lyrics.source}` 
                });

            if (lyrics.thumbnail) {
                embed.setThumbnail(lyrics.thumbnail);
            }

            const components = [];
            if (pages.length > 1) {
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('lyrics_prev')
                            .setEmoji('◀️')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('lyrics_page')
                            .setLabel(`${currentPageIndex + 1}/${pages.length}`)
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId('lyrics_next')
                            .setEmoji('▶️')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(pages.length === 1)
                    );
                components.push(row);
            }

            const response = await interaction.editReply({
                embeds: [embed],
                components
            });

            if (pages.length > 1) {
                const collector = response.createMessageComponentCollector({
                    time: 300000 // 5 minutes
                });

                collector.on('collect', async (i) => {
                    if (i.user.id !== interaction.user.id) {
                        return i.reply({
                            content: 'These buttons are not for you.',
                            ephemeral: true
                        });
                    }

                    if (i.customId === 'lyrics_prev') {
                        currentPageIndex = Math.max(0, currentPageIndex - 1);
                    } else if (i.customId === 'lyrics_next') {
                        currentPageIndex = Math.min(pages.length - 1, currentPageIndex + 1);
                    }

                    const newEmbed = EmbedBuilder.from(embed)
                        .setDescription(pages[currentPageIndex])
                        .setFooter({ 
                            text: `Page ${currentPageIndex + 1}/${pages.length} • Source: ${lyrics.source}` 
                        });

                    const newRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('lyrics_prev')
                                .setEmoji('◀️')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(currentPageIndex === 0),
                            new ButtonBuilder()
                                .setCustomId('lyrics_page')
                                .setLabel(`${currentPageIndex + 1}/${pages.length}`)
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(true),
                            new ButtonBuilder()
                                .setCustomId('lyrics_next')
                                .setEmoji('▶️')
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(currentPageIndex === pages.length - 1)
                        );

                    await i.update({ embeds: [newEmbed], components: [newRow] });
                });

                collector.on('end', async () => {
                    try {
                        await response.edit({ components: [] });
                    } catch (e) {}
                });
            }

        } catch (error) {
            client.logger.error('Lyrics error:', error);
            await interaction.editReply({
                embeds: [errorEmbed('Failed to fetch lyrics. Please try again later.')]
            });
        }
    }
};

async function fetchLyrics(query) {
    try {
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
        const response = await fetch(searchUrl);
        
        if (response.ok) {
            const results = await response.json();
            
            if (results && results.length > 0) {
                const first = results[0];
                return {
                    title: `${first.artistName} - ${first.trackName}`,
                    content: first.plainLyrics || first.syncedLyrics?.replace(/\[.*?\]/g, '').trim() || 'No lyrics available',
                    source: 'LRCLIB',
                    thumbnail: null
                };
            }
        }
    } catch (e) {
    }

    return null;
}
