import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Colors, formatDuration, successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('favorites')
        .setDescription('Manage your favorite tracks')
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('View your favorite tracks')
        )
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add current track to favorites')
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a track from favorites')
                .addIntegerOption(option =>
                    option.setName('position')
                        .setDescription('Position of the track to remove')
                        .setMinValue(1)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('play')
                .setDescription('Play all your favorites or a specific one')
                .addIntegerOption(option =>
                    option.setName('position')
                        .setDescription('Position of specific track to play')
                        .setMinValue(1)
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option.setName('shuffle')
                        .setDescription('Shuffle before playing')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('clear')
                .setDescription('Clear all favorites')
        ),
    
    category: 'music',
    cooldown: 3,

    async execute(client, interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'list':
                return listFavorites(client, interaction);
            case 'add':
                return addFavorite(client, interaction);
            case 'remove':
                return removeFavorite(client, interaction);
            case 'play':
                return playFavorites(client, interaction);
            case 'clear':
                return clearFavorites(client, interaction);
        }
    }
};

async function listFavorites(client, interaction) {
    const favorites = client.db.getUserFavorites(interaction.user.id);

    if (favorites.length === 0) {
        return interaction.reply({
            embeds: [errorEmbed('You have no favorite tracks. Use `/favorites add` while playing music!')],
            ephemeral: true
        });
    }

    const tracksPerPage = 10;
    const totalPages = Math.ceil(favorites.length / tracksPerPage);
    let page = 0;

    const embed = createFavoritesEmbed(favorites, page, tracksPerPage, interaction.user);
    const components = totalPages > 1 ? [createPaginationButtons(page, totalPages)] : [];

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
                return i.reply({ content: 'This is not your list.', ephemeral: true });
            }

            if (i.customId === 'fav_prev') page = Math.max(0, page - 1);
            else if (i.customId === 'fav_next') page = Math.min(totalPages - 1, page + 1);

            const newEmbed = createFavoritesEmbed(favorites, page, tracksPerPage, interaction.user);
            const newButtons = createPaginationButtons(page, totalPages);

            await i.update({ embeds: [newEmbed], components: [newButtons] });
        });

        collector.on('end', async () => {
            try { await response.edit({ components: [] }); } catch (e) {}
        });
    }
}

async function addFavorite(client, interaction) {
    const player = client.kazagumo.players.get(interaction.guildId);

    if (!player || !player.queue.current) {
        return interaction.reply({
            embeds: [errorEmbed('No music is currently playing.')],
            ephemeral: true
        });
    }

    const track = player.queue.current;

    const added = client.db.addFavorite(interaction.user.id, {
        title: track.title,
        uri: track.uri,
        duration: track.length,
        thumbnail: track.thumbnail,
        source: track.sourceName
    });

    if (!added) {
        return interaction.reply({
            embeds: [errorEmbed('This track is already in your favorites.')],
            ephemeral: true
        });
    }

    await interaction.reply({
        embeds: [successEmbed(`❤️ Added **${track.title}** to your favorites!`)]
    });
}

async function removeFavorite(client, interaction) {
    const position = interaction.options.getInteger('position');
    const favorites = client.db.getUserFavorites(interaction.user.id);

    if (position > favorites.length) {
        return interaction.reply({
            embeds: [errorEmbed(`Invalid position. You only have ${favorites.length} favorites.`)],
            ephemeral: true
        });
    }

    const favorite = favorites[position - 1];
    client.db.removeFavorite(interaction.user.id, favorite.id);

    await interaction.reply({
        embeds: [successEmbed(`🗑️ Removed **${favorite.title}** from your favorites.`)]
    });
}

async function playFavorites(client, interaction) {
    const position = interaction.options.getInteger('position');
    const shuffle = interaction.options.getBoolean('shuffle') || false;

    let favorites = client.db.getUserFavorites(interaction.user.id);

    if (favorites.length === 0) {
        return interaction.reply({
            embeds: [errorEmbed('You have no favorites to play.')],
            ephemeral: true
        });
    }

    if (!interaction.member.voice?.channel) {
        return interaction.reply({
            embeds: [errorEmbed('You need to be in a voice channel.')],
            ephemeral: true
        });
    }

    await interaction.deferReply();

    const settings = client.db.getGuildSettings(interaction.guildId);
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

    if (position) {
        if (position > favorites.length) {
            return interaction.editReply({
                embeds: [errorEmbed('Invalid position.')]
            });
        }

        const favorite = favorites[position - 1];
        const result = await client.kazagumo.search(favorite.uri, {
            requester: interaction.user
        });

        if (result.tracks.length > 0) {
            player.queue.add(result.tracks[0]);
            if (!player.playing && !player.paused) await player.play();

            return interaction.editReply({
                embeds: [successEmbed(`❤️ Playing **${favorite.title}** from favorites`)]
            });
        }
    } else {
        if (shuffle) {
            for (let i = favorites.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [favorites[i], favorites[j]] = [favorites[j], favorites[i]];
            }
        }

        let added = 0;
        for (const favorite of favorites) {
            try {
                const result = await client.kazagumo.search(favorite.uri, {
                    requester: interaction.user
                });

                if (result.tracks.length > 0) {
                    player.queue.add(result.tracks[0]);
                    added++;
                }
            } catch (e) {
            }
        }

        if (!player.playing && !player.paused) await player.play();

        return interaction.editReply({
            embeds: [successEmbed(`❤️ Added **${added}** favorites to the queue!` + 
                (shuffle ? ' (shuffled)' : ''))]
        });
    }
}

async function clearFavorites(client, interaction) {
    const favorites = client.db.getUserFavorites(interaction.user.id);

    if (favorites.length === 0) {
        return interaction.reply({
            embeds: [errorEmbed('You have no favorites to clear.')],
            ephemeral: true
        });
    }

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('fav_clear_confirm')
                .setLabel('Yes, clear all')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('fav_clear_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

    const response = await interaction.reply({
        embeds: [errorEmbed(`Are you sure you want to delete all **${favorites.length}** favorites? This cannot be undone.`)],
        components: [row],
        fetchReply: true
    });

    const collector = response.createMessageComponentCollector({
        time: 30000
    });

    collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
            return i.reply({ content: 'This is not for you.', ephemeral: true });
        }

        if (i.customId === 'fav_clear_confirm') {
            client.db.clearAllFavorites(interaction.user.id);
            await i.update({
                embeds: [successEmbed(`🗑️ Cleared all **${favorites.length}** favorites.`)],
                components: []
            });
        } else {
            await i.update({
                embeds: [successEmbed('Cancelled.')],
                components: []
            });
        }
    });

    collector.on('end', async (_, reason) => {
        if (reason === 'time') {
            try { await response.edit({ components: [] }); } catch (e) {}
        }
    });
}

function createFavoritesEmbed(favorites, page, perPage, user) {
    const start = page * perPage;
    const end = Math.min(start + perPage, favorites.length);
    const pageFavorites = favorites.slice(start, end);

    const description = pageFavorites.map((fav, index) => {
        const position = start + index + 1;
        return `\`${position}.\` [${fav.title}](${fav.uri}) \`[${formatDuration(fav.duration)}]\``;
    }).join('\n');

    return new EmbedBuilder()
        .setColor(Colors.primary)
        .setAuthor({ name: `${user.username}'s Favorites`, iconURL: user.displayAvatarURL() })
        .setDescription(description || 'No favorites')
        .setFooter({ 
            text: `${favorites.length} tracks • Page ${page + 1}/${Math.ceil(favorites.length / perPage)}` 
        });
}

function createPaginationButtons(page, totalPages) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('fav_prev')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId('fav_page')
                .setLabel(`${page + 1}/${totalPages}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('fav_next')
                .setEmoji('▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === totalPages - 1)
        );
}
