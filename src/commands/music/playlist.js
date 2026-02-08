import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Colors, formatDuration, successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('playlist')
        .setDescription('Create and manage your playlists')
        .addSubcommand(sub =>
            sub.setName('create')
                .setDescription('Create a new playlist')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Playlist name')
                        .setRequired(true)
                        .setMaxLength(50)
                )
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Playlist description')
                        .setRequired(false)
                        .setMaxLength(200)
                )
                .addBooleanOption(option =>
                    option.setName('public')
                        .setDescription('Make playlist public')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('delete')
                .setDescription('Delete a playlist')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Playlist name')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('View your playlists')
        )
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View tracks in a playlist')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Playlist name')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add current track to a playlist')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Playlist name')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a track from a playlist')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Playlist name')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addIntegerOption(option =>
                    option.setName('position')
                        .setDescription('Position of track to remove')
                        .setMinValue(1)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('play')
                .setDescription('Play a playlist')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Playlist name')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addBooleanOption(option =>
                    option.setName('shuffle')
                        .setDescription('Shuffle before playing')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('save')
                .setDescription('Save current queue as a playlist')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Playlist name')
                        .setRequired(true)
                        .setMaxLength(50)
                )
        ),
    
    category: 'music',
    cooldown: 3,

    async execute(client, interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'create': return createPlaylist(client, interaction);
            case 'delete': return deletePlaylist(client, interaction);
            case 'list': return listPlaylists(client, interaction);
            case 'view': return viewPlaylist(client, interaction);
            case 'add': return addToPlaylist(client, interaction);
            case 'remove': return removeFromPlaylist(client, interaction);
            case 'play': return playPlaylist(client, interaction);
            case 'save': return saveQueue(client, interaction);
        }
    },

    async autocomplete(client, interaction) {
        const focused = interaction.options.getFocused();
        const playlists = client.db.getUserPlaylists(interaction.user.id);

        const filtered = playlists
            .filter(p => p.name.toLowerCase().includes(focused.toLowerCase()))
            .slice(0, 25)
            .map(p => ({ name: p.name, value: p.name }));

        await interaction.respond(filtered);
    }
};

async function createPlaylist(client, interaction) {
    const name = interaction.options.getString('name');
    const description = interaction.options.getString('description') || '';
    const isPublic = interaction.options.getBoolean('public') || false;

    const existing = client.db.getUserPlaylists(interaction.user.id);
    if (existing.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        return interaction.reply({
            embeds: [errorEmbed('You already have a playlist with that name.')],
            ephemeral: true
        });
    }

    if (existing.length >= 25) {
        return interaction.reply({
            embeds: [errorEmbed('You have reached the maximum of 25 playlists.')],
            ephemeral: true
        });
    }

    const result = client.db.createPlaylist(interaction.user.id, name, [], isPublic);

    if (!result) {
        return interaction.reply({
            embeds: [errorEmbed('Failed to create playlist.')],
            ephemeral: true
        });
    }

    const embed = new EmbedBuilder()
        .setColor(Colors.success)
        .setTitle('📋 Playlist Created')
        .setDescription(`Created playlist **${name}**`)
        .addFields(
            { name: 'Visibility', value: isPublic ? '🌍 Public' : '🔒 Private', inline: true }
        )
        .setFooter({ text: 'Use /playlist add to add tracks' });

    await interaction.reply({ embeds: [embed] });
}

async function deletePlaylist(client, interaction) {
    const name = interaction.options.getString('name');
    const playlists = client.db.getUserPlaylists(interaction.user.id);
    const playlist = playlists.find(p => p.name.toLowerCase() === name.toLowerCase());

    if (!playlist) {
        return interaction.reply({
            embeds: [errorEmbed('Playlist not found.')],
            ephemeral: true
        });
    }

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('playlist_delete_confirm')
                .setLabel('Delete')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('playlist_delete_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

    const response = await interaction.reply({
        embeds: [errorEmbed(`Delete playlist **${playlist.name}** with ${playlist.song_count || 0} tracks?`)],
        components: [row],
        fetchReply: true
    });

    const collector = response.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
            return i.reply({ content: 'Not for you.', ephemeral: true });
        }

        if (i.customId === 'playlist_delete_confirm') {
            client.db.deletePlaylist(interaction.user.id, playlist.name);
            await i.update({
                embeds: [successEmbed(`🗑️ Deleted playlist **${playlist.name}**`)],
                components: []
            });
        } else {
            await i.update({
                embeds: [successEmbed('Cancelled.')],
                components: []
            });
        }
    });
}

async function listPlaylists(client, interaction) {
    const playlists = client.db.getUserPlaylists(interaction.user.id);

    if (playlists.length === 0) {
        return interaction.reply({
            embeds: [errorEmbed('You have no playlists. Create one with `/playlist create`!')],
            ephemeral: true
        });
    }

    const description = playlists.map((p, i) => {
        const visibility = p.is_public ? '🌍' : '🔒';
        const trackCount = p.song_count || 0;
        return `**${i + 1}.** ${visibility} ${p.name} - ${trackCount} tracks`;
    }).join('\n');

    const embed = new EmbedBuilder()
        .setColor(Colors.primary)
        .setAuthor({ name: `${interaction.user.username}'s Playlists`, iconURL: interaction.user.displayAvatarURL() })
        .setDescription(description)
        .setFooter({ text: `${playlists.length}/25 playlists` });

    await interaction.reply({ embeds: [embed] });
}

async function viewPlaylist(client, interaction) {
    const name = interaction.options.getString('name');
    const playlist = client.db.getPlaylist(interaction.user.id, name);

    if (!playlist) {
        return interaction.reply({
            embeds: [errorEmbed('Playlist not found.')],
            ephemeral: true
        });
    }

    const tracks = playlist.songs || [];
    
    if (tracks.length === 0) {
        return interaction.reply({
            embeds: [errorEmbed(`Playlist **${playlist.name}** is empty.`)],
            ephemeral: true
        });
    }

    const tracksPerPage = 10;
    const totalPages = Math.ceil(tracks.length / tracksPerPage);
    let page = 0;

    const embed = createPlaylistEmbed(playlist, page, tracksPerPage);
    const components = totalPages > 1 ? [createPlaylistButtons(page, totalPages)] : [];

    const response = await interaction.reply({
        embeds: [embed],
        components,
        fetchReply: true
    });

    if (totalPages > 1) {
        const collector = response.createMessageComponentCollector({ time: 120000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'Not for you.', ephemeral: true });
            }

            if (i.customId === 'pl_prev') page = Math.max(0, page - 1);
            else if (i.customId === 'pl_next') page = Math.min(totalPages - 1, page + 1);

            await i.update({
                embeds: [createPlaylistEmbed(playlist, page, tracksPerPage)],
                components: [createPlaylistButtons(page, totalPages)]
            });
        });

        collector.on('end', async () => {
            try { await response.edit({ components: [] }); } catch (e) {}
        });
    }
}

async function addToPlaylist(client, interaction) {
    const name = interaction.options.getString('name');
    const player = client.kazagumo.players.get(interaction.guildId);

    if (!player || !player.queue.current) {
        return interaction.reply({
            embeds: [errorEmbed('No music is currently playing.')],
            ephemeral: true
        });
    }

    const playlist = client.db.getPlaylist(interaction.user.id, name);

    if (!playlist) {
        return interaction.reply({
            embeds: [errorEmbed('Playlist not found.')],
            ephemeral: true
        });
    }

    const track = player.queue.current;
    const songs = playlist.songs || [];

    if (songs.some(t => t.uri === track.uri)) {
        return interaction.reply({
            embeds: [errorEmbed('This track is already in the playlist.')],
            ephemeral: true
        });
    }

    if (songs.length >= 200) {
        return interaction.reply({
            embeds: [errorEmbed('Playlist has reached the maximum of 200 tracks.')],
            ephemeral: true
        });
    }

    songs.push({
        title: track.title,
        uri: track.uri,
        duration: track.length,
        author: track.author,
        thumbnail: track.thumbnail
    });

    client.db.updatePlaylist(interaction.user.id, name, songs);

    await interaction.reply({
        embeds: [successEmbed(`➕ Added **${track.title}** to **${playlist.name}**`)]
    });
}

async function removeFromPlaylist(client, interaction) {
    const name = interaction.options.getString('name');
    const position = interaction.options.getInteger('position');

    const playlist = client.db.getPlaylist(interaction.user.id, name);

    if (!playlist) {
        return interaction.reply({
            embeds: [errorEmbed('Playlist not found.')],
            ephemeral: true
        });
    }

    const songs = playlist.songs || [];

    if (position > songs.length) {
        return interaction.reply({
            embeds: [errorEmbed(`Invalid position. Playlist has ${songs.length} tracks.`)],
            ephemeral: true
        });
    }

    const removed = songs.splice(position - 1, 1)[0];
    client.db.updatePlaylist(interaction.user.id, name, songs);

    await interaction.reply({
        embeds: [successEmbed(`🗑️ Removed **${removed.title}** from **${playlist.name}**`)]
    });
}

async function playPlaylist(client, interaction) {
    const name = interaction.options.getString('name');
    const shuffle = interaction.options.getBoolean('shuffle') || false;

    if (!interaction.member.voice?.channel) {
        return interaction.reply({
            embeds: [errorEmbed('You need to be in a voice channel.')],
            ephemeral: true
        });
    }

    const playlist = client.db.getPlaylist(interaction.user.id, name);

    if (!playlist) {
        return interaction.reply({
            embeds: [errorEmbed('Playlist not found.')],
            ephemeral: true
        });
    }

    let tracks = [...(playlist.songs || [])];

    if (tracks.length === 0) {
        return interaction.reply({
            embeds: [errorEmbed('Playlist is empty.')],
            ephemeral: true
        });
    }

    await interaction.deferReply();

    if (shuffle) {
        for (let i = tracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
        }
    }

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

    let added = 0;
    for (const track of tracks) {
        try {
            const result = await client.kazagumo.search(track.uri, {
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

    await interaction.editReply({
        embeds: [successEmbed(`📋 Playing **${playlist.name}**\nAdded **${added}** tracks` + 
            (shuffle ? ' (shuffled)' : ''))]
    });
}

async function saveQueue(client, interaction) {
    const name = interaction.options.getString('name');
    const player = client.kazagumo.players.get(interaction.guildId);

    if (!player || !player.queue.current) {
        return interaction.reply({
            embeds: [errorEmbed('No music is currently playing.')],
            ephemeral: true
        });
    }

    const existing = client.db.getUserPlaylists(interaction.user.id);
    if (existing.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        return interaction.reply({
            embeds: [errorEmbed('A playlist with that name already exists.')],
            ephemeral: true
        });
    }

    if (existing.length >= 25) {
        return interaction.reply({
            embeds: [errorEmbed('You have reached the maximum of 25 playlists.')],
            ephemeral: true
        });
    }

    const tracks = [player.queue.current, ...player.queue].map(track => ({
        title: track.title,
        uri: track.uri,
        duration: track.length,
        author: track.author,
        thumbnail: track.thumbnail
    }));

    const playlistId = client.db.createPlaylist(interaction.user.id, name, tracks);

    if (!playlistId) {
        return interaction.reply({
            embeds: [errorEmbed('A playlist with that name already exists.')],
            ephemeral: true
        });
    }

    await interaction.reply({
        embeds: [successEmbed(`💾 Saved **${tracks.length}** tracks to playlist **${name}**`)]
    });
}

function createPlaylistEmbed(playlist, page, perPage) {
    const tracks = playlist.songs || [];
    const start = page * perPage;
    const end = Math.min(start + perPage, tracks.length);
    const pageTracks = tracks.slice(start, end);

    let totalDuration = 0;
    tracks.forEach(t => totalDuration += t.duration || 0);

    const description = pageTracks.map((t, i) => {
        const pos = start + i + 1;
        return `\`${pos}.\` [${t.title}](${t.uri}) \`[${formatDuration(t.duration)}]\``;
    }).join('\n');

    return new EmbedBuilder()
        .setColor(Colors.primary)
        .setTitle(`📋 ${playlist.name}`)
        .setDescription(description || 'Empty playlist')
        .setFooter({ 
            text: `${tracks.length} tracks • ${formatDuration(totalDuration)} • Page ${page + 1}/${Math.ceil(tracks.length / perPage) || 1}` 
        });
}

function createPlaylistButtons(page, totalPages) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('pl_prev')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId('pl_page')
                .setLabel(`${page + 1}/${totalPages}`)
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('pl_next')
                .setEmoji('▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === totalPages - 1)
        );
}
