import { InteractionType, ComponentType } from 'discord.js';
import { errorEmbed } from '../utils/embeds.js';

export default {
    name: 'interactionCreate',

    async execute(client, interaction) {
        try {
            if (interaction.isChatInputCommand()) {
                await handleSlashCommand(client, interaction);
            }
            else if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
                await handleAutocomplete(client, interaction);
            }
            else if (interaction.isButton()) {
                await handleButton(client, interaction);
            }
            else if (interaction.isAnySelectMenu()) {
                await handleSelectMenu(client, interaction);
            }
            else if (interaction.type === InteractionType.ModalSubmit) {
                await handleModal(client, interaction);
            }
            else if (interaction.isContextMenuCommand()) {
                await handleContextMenu(client, interaction);
            }
        } catch (error) {
            client.logger.error('Interaction error:', error);
            
            try {
                const reply = { 
                    embeds: [errorEmbed('An unexpected error occurred.')], 
                    ephemeral: true 
                };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            } catch (e) {
            }
        }
    }
};

async function handleSlashCommand(client, interaction) {
    const command = client.commands.get(interaction.commandName);
    
    if (!command) {
        return interaction.reply({
            embeds: [errorEmbed('This command no longer exists.')],
            ephemeral: true
        });
    }

    if (interaction.guildId) {
        const userRoles = interaction.member?.roles?.cache?.map(r => r.id) || [];
        const permCheck = client.db.canUseCommand(
            interaction.guildId, 
            command.data.name, 
            interaction.user.id, 
            userRoles
        );

        if (!permCheck.allowed) {
            const messages = {
                command_disabled: 'This command is disabled in this server.',
                user_denied: 'You are not allowed to use this command.',
                role_denied: 'Your role is not allowed to use this command.',
                not_allowed: 'You do not have permission to use this command.'
            };
            
            return interaction.reply({
                embeds: [errorEmbed(messages[permCheck.reason] || 'Permission denied.')],
                ephemeral: true
            });
        }

        const rateLimit = client.db.checkRateLimit(
            interaction.user.id, 
            `cmd:${command.data.name}`, 
            10,  // 10 uses
            60000 // per minute
        );

        if (rateLimit.limited) {
            const seconds = Math.ceil(rateLimit.retryAfter / 1000);
            return interaction.reply({
                embeds: [errorEmbed(`You're using this command too fast. Try again in ${seconds}s.`)],
                ephemeral: true
            });
        }
    }

    const cooldownAmount = (command.cooldown || 3) * 1000;
    const timestamps = client.cooldowns.get(command.data.name) || new Map();
    
    if (timestamps.has(interaction.user.id)) {
        const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;
        
        if (Date.now() < expirationTime) {
            const remaining = (expirationTime - Date.now()) / 1000;
            return interaction.reply({
                embeds: [errorEmbed(`Please wait ${remaining.toFixed(1)}s before using \`/${command.data.name}\` again.`)],
                ephemeral: true
            });
        }
    }

    timestamps.set(interaction.user.id, Date.now());
    client.cooldowns.set(command.data.name, timestamps);

    client.logger.command(
        command.data.name,
        interaction.user.tag,
        interaction.guild?.name || 'DM'
    );

    if (interaction.guildId) {
        client.db.incrementStats(interaction.guildId, 'commands_used');
    }

    try {
        await command.execute(client, interaction);
    } catch (error) {
        await client.errorHandler.handleCommandError(error, interaction, command.data.name);
    }
}

async function handleAutocomplete(client, interaction) {
    const command = client.commands.get(interaction.commandName);
    
    if (!command?.autocomplete) return;

    try {
        await command.autocomplete(client, interaction);
    } catch (error) {
        client.logger.error('Autocomplete error:', error);
        await interaction.respond([]);
    }
}

async function handleButton(client, interaction) {
    const customId = interaction.customId;

    const handler = client.buttons.get(customId) 
        || client.buttons.get(customId.split('_')[0] + '_*');

    if (handler) {
        try {
            await handler.execute(client, interaction);
        } catch (error) {
            client.logger.error('Button error:', error);
            await interaction.reply({
                embeds: [errorEmbed('Failed to process button.')],
                ephemeral: true
            });
        }
        return;
    }

    if (customId.startsWith('music_')) {
        await handleMusicButton(client, interaction);
        return;
    }

    if (customId.startsWith('queue_')) {
        await handleQueueButton(client, interaction);
        return;
    }

    if (customId.startsWith('discover_')) {
        await handleDiscoverButton(client, interaction);
        return;
    }

    if (customId.startsWith('bass_')) {
        await handleBassButton(client, interaction);
        return;
    }
}

async function handleMusicButton(client, interaction) {
    const player = client.kazagumo.players.get(interaction.guildId);
    
    if (!player) {
        return interaction.reply({
            embeds: [errorEmbed('No music is currently playing.')],
            ephemeral: true
        });
    }

    if (!interaction.member.voice?.channel) {
        return interaction.reply({
            embeds: [errorEmbed('You need to be in a voice channel.')],
            ephemeral: true
        });
    }

    if (interaction.member.voice.channel.id !== player.voiceId) {
        return interaction.reply({
            embeds: [errorEmbed('You need to be in the same voice channel.')],
            ephemeral: true
        });
    }

    const action = interaction.customId.replace('music_', '');

    switch (action) {
        case 'playpause':
            if (player.paused) {
                player.pause(false);
                await interaction.reply({ content: '▶️ **Resumed**', ephemeral: true });
            } else {
                player.pause(true);
                await interaction.reply({ content: '⏸️ **Paused**', ephemeral: true });
            }
            break;

        case 'skip':
            player.skip();
            await interaction.reply({ content: '⏭️ **Skipped**', ephemeral: true });
            break;

        case 'stop':
            player.destroy();
            await interaction.reply({ content: '⏹️ **Stopped and left channel**', ephemeral: true });
            break;

        case 'previous':
            if (player.queue.previous) {
                await player.play(player.queue.previous);
                await interaction.reply({ content: '⏮️ **Playing previous track**', ephemeral: true });
            } else {
                await interaction.reply({ content: '❌ No previous track', ephemeral: true });
            }
            break;

        case 'loop':
            const modes = ['none', 'track', 'queue'];
            const currentIndex = modes.indexOf(player.loop || 'none');
            const newMode = modes[(currentIndex + 1) % 3];
            player.setLoop(newMode);
            
            const loopEmoji = newMode === 'track' ? '🔂' : newMode === 'queue' ? '🔁' : '➡️';
            await interaction.reply({ 
                content: `${loopEmoji} **Loop mode:** ${newMode}`, 
                ephemeral: true 
            });
            break;

        case 'shuffle':
            player.queue.shuffle();
            await interaction.reply({ content: '🔀 **Queue shuffled**', ephemeral: true });
            break;

        case 'favorite':
            const track = player.queue.current;
            if (track) {
                const added = client.db.addFavorite(interaction.user.id, {
                    title: track.title,
                    uri: track.uri,
                    duration: track.length,
                    thumbnail: track.thumbnail,
                    source: track.sourceName
                });
                await interaction.reply({ 
                    content: added ? '❤️ **Added to favorites**' : '❤️ Already in favorites', 
                    ephemeral: true 
                });
            }
            break;

        default:
            await interaction.reply({ content: 'Unknown action', ephemeral: true });
    }
}

async function handleQueueButton(client, interaction) {
    await interaction.deferUpdate();
}

async function handleSelectMenu(client, interaction) {
    const customId = interaction.customId;

    if (customId === 'discover_select') {
        await handleDiscoverSelect(client, interaction);
        return;
    }

    const handler = client.selectMenus.get(customId);

    if (handler) {
        try {
            await handler.execute(client, interaction);
        } catch (error) {
            client.logger.error('Select menu error:', error);
        }
    }
}

async function handleModal(client, interaction) {
    const customId = interaction.customId;
    const handler = client.modals.get(customId);

    if (handler) {
        try {
            await handler.execute(client, interaction);
        } catch (error) {
            client.logger.error('Modal error:', error);
        }
    }
}

async function handleContextMenu(client, interaction) {
}

async function handleDiscoverButton(client, interaction) {
    const action = interaction.customId.replace('discover_', '');
    
    const cache = client.discoverCache?.get(interaction.user.id);
    const player = client.kazagumo.players.get(interaction.guildId);

    if (!cache || !cache.tracks || cache.tracks.length === 0) {
        return interaction.reply({
            embeds: [errorEmbed('Discovery data expired. Please run /discover again.')],
            ephemeral: true
        });
    }

    if (!interaction.member.voice?.channel) {
        return interaction.reply({
            embeds: [errorEmbed('You need to be in a voice channel.')],
            ephemeral: true
        });
    }

    try {
        switch (action) {
            case 'add_all': {
                await interaction.deferReply({ ephemeral: true });
                let currentPlayer = player || await client.kazagumo.createPlayer({
                    guildId: interaction.guildId,
                    voiceId: interaction.member.voice.channel.id,
                    textId: interaction.channelId,
                    deaf: true
                });

                let added = 0;
                for (const track of cache.tracks) {
                    try {
                        const result = await client.kazagumo.search(track.uri, { requester: interaction.user });
                        if (result.tracks.length > 0) {
                            currentPlayer.queue.add(result.tracks[0]);
                            added++;
                        }
                    } catch (e) { /* skip failed tracks */ }
                }

                if (!currentPlayer.playing && !currentPlayer.paused && currentPlayer.queue.size > 0) {
                    currentPlayer.play();
                }

                await interaction.editReply({ content: `➕ Added **${added}** tracks to the queue!` });
                break;
            }

            case 'shuffle_all': {
                await interaction.deferReply({ ephemeral: true });
                let currentPlayer = player || await client.kazagumo.createPlayer({
                    guildId: interaction.guildId,
                    voiceId: interaction.member.voice.channel.id,
                    textId: interaction.channelId,
                    deaf: true
                });

                const shuffled = [...cache.tracks].sort(() => Math.random() - 0.5);
                let added = 0;
                for (const track of shuffled) {
                    try {
                        const result = await client.kazagumo.search(track.uri, { requester: interaction.user });
                        if (result.tracks.length > 0) {
                            currentPlayer.queue.add(result.tracks[0]);
                            added++;
                        }
                    } catch (e) { /* skip failed tracks */ }
                }

                if (!currentPlayer.playing && !currentPlayer.paused && currentPlayer.queue.size > 0) {
                    currentPlayer.play();
                }

                await interaction.editReply({ content: `🔀 Shuffled and added **${added}** tracks to the queue!` });
                break;
            }

            case 'refresh': {
                await interaction.reply({ content: '🔄 Use `/discover` again to get fresh recommendations!', ephemeral: true });
                break;
            }

            case 'create_playlist': {
                await interaction.deferReply({ ephemeral: true });
                const playlistName = `discover-${cache.type}-${Date.now()}`;
                const songs = cache.tracks.map(t => ({
                    title: t.title,
                    uri: t.uri,
                    duration: t.length || 0,
                    author: t.author || 'Unknown'
                }));

                const result = client.db.createPlaylist(interaction.user.id, playlistName, songs);
                if (result) {
                    await interaction.editReply({ content: `💾 Saved as playlist: **${playlistName}**` });
                } else {
                    await interaction.editReply({ content: '❌ Failed to save playlist.' });
                }
                break;
            }

            default:
                await interaction.reply({ content: 'Unknown action', ephemeral: true });
        }
    } catch (error) {
        client.logger.error('Discover button error:', error);
        const reply = { content: '❌ Something went wrong.', ephemeral: true };
        if (interaction.deferred) {
            await interaction.editReply(reply);
        } else {
            await interaction.reply(reply);
        }
    }
}

async function handleDiscoverSelect(client, interaction) {
    const selectedUris = interaction.values;

    if (!interaction.member.voice?.channel) {
        return interaction.reply({
            embeds: [errorEmbed('You need to be in a voice channel.')],
            ephemeral: true
        });
    }

    try {
        await interaction.deferReply({ ephemeral: true });

        let player = client.kazagumo.players.get(interaction.guildId) || await client.kazagumo.createPlayer({
            guildId: interaction.guildId,
            voiceId: interaction.member.voice.channel.id,
            textId: interaction.channelId,
            deaf: true
        });

        let added = 0;
        for (const uri of selectedUris) {
            try {
                const result = await client.kazagumo.search(uri, { requester: interaction.user });
                if (result.tracks.length > 0) {
                    player.queue.add(result.tracks[0]);
                    added++;
                }
            } catch (e) { /* skip failed */ }
        }

        if (!player.playing && !player.paused && player.queue.size > 0) {
            player.play();
        }

        await interaction.editReply({ content: `🎵 Added **${added}** selected track(s) to the queue!` });
    } catch (error) {
        client.logger.error('Discover select error:', error);
        if (interaction.deferred) {
            await interaction.editReply({ content: '❌ Failed to add tracks.' });
        } else {
            await interaction.reply({ content: '❌ Failed to add tracks.', ephemeral: true });
        }
    }
}

async function handleBassButton(client, interaction) {
    const level = interaction.customId.replace('bass_', '');
    const player = client.kazagumo.players.get(interaction.guildId);

    if (!player || !player.queue.current) {
        return interaction.reply({
            embeds: [errorEmbed('No music is currently playing.')],
            ephemeral: true
        });
    }

    if (!interaction.member.voice?.channel) {
        return interaction.reply({
            embeds: [errorEmbed('You need to be in a voice channel.')],
            ephemeral: true
        });
    }

    const BASSBOOST_LEVELS = {
        off: { name: 'Off', bands: null },
        low: { 
            name: 'Low',
            bands: [
                { band: 0, gain: 0.1 }, { band: 1, gain: 0.1 },
                { band: 2, gain: 0.05 }, { band: 3, gain: 0.05 }
            ]
        },
        medium: { 
            name: 'Medium',
            bands: [
                { band: 0, gain: 0.2 }, { band: 1, gain: 0.2 },
                { band: 2, gain: 0.15 }, { band: 3, gain: 0.1 }, { band: 4, gain: 0.05 }
            ]
        },
        high: { 
            name: 'High',
            bands: [
                { band: 0, gain: 0.35 }, { band: 1, gain: 0.35 },
                { band: 2, gain: 0.25 }, { band: 3, gain: 0.2 },
                { band: 4, gain: 0.15 }, { band: 5, gain: 0.1 }
            ]
        },
        extreme: { 
            name: 'Extreme',
            bands: [
                { band: 0, gain: 0.5 }, { band: 1, gain: 0.5 },
                { band: 2, gain: 0.4 }, { band: 3, gain: 0.35 },
                { band: 4, gain: 0.25 }, { band: 5, gain: 0.2 }, { band: 6, gain: 0.15 }
            ]
        }
    };

    const preset = BASSBOOST_LEVELS[level];
    if (!preset) {
        return interaction.reply({ content: 'Unknown bass level.', ephemeral: true });
    }

    try {
        if (preset.bands) {
            await player.shoukaku.setFilters({ equalizer: preset.bands });
        } else {
            await player.shoukaku.clearFilters();
        }
        player.data.set('bassboost', level);

        const emoji = level === 'off' ? '🔇' : level === 'extreme' ? '💥' : '🔊';
        await interaction.reply({ content: `${emoji} Bass boost set to **${preset.name}**`, ephemeral: true });
    } catch (error) {
        client.logger.error('Bass button error:', error);
        await interaction.reply({ content: '❌ Failed to apply bass boost.', ephemeral: true });
    }
}
