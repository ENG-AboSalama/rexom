import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { canUseMusic, hasDJPermissions } from '../../utils/validators.js';
import { Colors, successEmbed, errorEmbed } from '../../utils/embeds.js';


const FILTERS = {
    nightcore: { name: 'Nightcore', emoji: '🌙', desc: 'Speed up + pitch up', settings: { timescale: { speed: 1.25, pitch: 1.3, rate: 1.0 } } },
    vaporwave: { name: 'Vaporwave', emoji: '🌊', desc: 'Slow down + pitch down', settings: { timescale: { speed: 0.8, pitch: 0.8, rate: 1.0 } } },
    '8d': { name: '8D Audio', emoji: '🎧', desc: 'Rotating stereo', settings: { rotation: { rotationHz: 0.2 } } },
    karaoke: { name: 'Karaoke', emoji: '🎤', desc: 'Reduce vocals', settings: { karaoke: { level: 1.0, monoLevel: 1.0, filterBand: 220.0, filterWidth: 100.0 } } },
    tremolo: { name: 'Tremolo', emoji: '〰️', desc: 'Wavering volume', settings: { tremolo: { frequency: 4.0, depth: 0.5 } } },
    vibrato: { name: 'Vibrato', emoji: '🎸', desc: 'Wavering pitch', settings: { vibrato: { frequency: 4.0, depth: 0.5 } } },
    bass: { name: 'Bass Boost', emoji: '🔊', desc: 'Enhanced bass', settings: { equalizer: [{ band: 0, gain: 0.6 }, { band: 1, gain: 0.5 }, { band: 2, gain: 0.4 }, { band: 3, gain: 0.25 }] } },
    treble: { name: 'Treble Boost', emoji: '🔔', desc: 'Enhanced treble', settings: { equalizer: [{ band: 10, gain: 0.2 }, { band: 11, gain: 0.25 }, { band: 12, gain: 0.3 }, { band: 13, gain: 0.35 }, { band: 14, gain: 0.4 }] } },
    soft: { name: 'Soft', emoji: '☁️', desc: 'Soft/relaxing', settings: { lowPass: { smoothing: 20 } } },
    pop: { name: 'Pop', emoji: '🎵', desc: 'Enhanced vocals', settings: { equalizer: [{ band: 0, gain: -0.25 }, { band: 1, gain: 0.5 }, { band: 2, gain: 0.5 }, { band: 3, gain: 0.25 }] } },
    lowpass: { name: 'Low Pass', emoji: '🔇', desc: 'Muffled/underwater', settings: { lowPass: { smoothing: 15 } } },
};

const PRESETS = {
    chipmunk: { name: 'Chipmunk', emoji: '🐿️', desc: 'High pitch + fast', settings: { timescale: { speed: 1.3, pitch: 1.4, rate: 1.0 } } },
    darth_vader: { name: 'Darth Vader', emoji: '⚫', desc: 'Deep slow voice', settings: { timescale: { speed: 0.8, pitch: 0.6, rate: 1.0 } } },
    slowed_reverb: { name: 'Slowed + Reverb', emoji: '🌙', desc: 'Aesthetic slowed', settings: { timescale: { speed: 0.85, pitch: 0.9, rate: 1.0 }, lowPass: { smoothing: 10 } } },
    daycore: { name: 'Daycore', emoji: '☀️', desc: 'Opposite of nightcore', settings: { timescale: { speed: 0.85, pitch: 0.85, rate: 1.0 } } },
    underwater: { name: 'Underwater', emoji: '🌊', desc: 'Muffled sound', settings: { lowPass: { smoothing: 20 }, tremolo: { frequency: 1.5, depth: 0.3 } } },
    phonk: { name: 'Phonk', emoji: '🚗', desc: 'Memphis phonk', settings: { equalizer: [{ band: 0, gain: 0.4 }, { band: 1, gain: 0.35 }, { band: 2, gain: 0.25 }], timescale: { speed: 0.9, pitch: 0.95, rate: 1.0 } } },
    lofi: { name: 'Lo-Fi', emoji: '📻', desc: 'Vintage lo-fi', settings: { equalizer: [{ band: 0, gain: 0.2 }, { band: 1, gain: 0.15 }, { band: 12, gain: -0.2 }, { band: 13, gain: -0.25 }], tremolo: { frequency: 2, depth: 0.1 } } },
    concert: { name: 'Concert Hall', emoji: '🏟️', desc: 'Live atmosphere', settings: { equalizer: [{ band: 0, gain: 0.3 }, { band: 1, gain: 0.25 }, { band: 10, gain: 0.15 }, { band: 11, gain: 0.2 }], tremolo: { frequency: 1.5, depth: 0.15 } } },
    metal: { name: 'Metal', emoji: '🤘', desc: 'Heavy enhancement', settings: { equalizer: [{ band: 0, gain: 0.3 }, { band: 3, gain: 0.2 }, { band: 7, gain: 0.25 }, { band: 10, gain: 0.2 }, { band: 12, gain: 0.3 }] } },
    jazz: { name: 'Jazz Club', emoji: '🎷', desc: 'Warm jazz tone', settings: { equalizer: [{ band: 0, gain: 0.15 }, { band: 5, gain: 0.2 }, { band: 6, gain: 0.25 }, { band: 7, gain: 0.2 }] } },
};

const EQ_PRESETS = {
    flat: { name: 'Flat', emoji: '⬜', bands: null },
    bass: { name: 'Bass Boost', emoji: '🔊', bands: [{ band: 0, gain: 0.3 }, { band: 1, gain: 0.25 }, { band: 2, gain: 0.2 }, { band: 3, gain: 0.15 }, { band: 4, gain: 0.1 }] },
    treble: { name: 'Treble Boost', emoji: '🔔', bands: [{ band: 10, gain: 0.2 }, { band: 11, gain: 0.25 }, { band: 12, gain: 0.3 }, { band: 13, gain: 0.35 }, { band: 14, gain: 0.4 }] },
    vocal: { name: 'Vocal', emoji: '🎤', bands: [{ band: 0, gain: -0.1 }, { band: 5, gain: 0.15 }, { band: 6, gain: 0.2 }, { band: 7, gain: 0.15 }] },
    electronic: { name: 'Electronic', emoji: '⚡', bands: [{ band: 0, gain: 0.3 }, { band: 1, gain: 0.2 }, { band: 10, gain: 0.15 }, { band: 12, gain: 0.2 }, { band: 14, gain: 0.3 }] },
    rock: { name: 'Rock', emoji: '🎸', bands: [{ band: 0, gain: 0.2 }, { band: 1, gain: 0.15 }, { band: 10, gain: 0.15 }, { band: 11, gain: 0.2 }, { band: 12, gain: 0.2 }] },
    pop: { name: 'Pop', emoji: '🎵', bands: [{ band: 1, gain: 0.1 }, { band: 5, gain: 0.2 }, { band: 6, gain: 0.15 }, { band: 8, gain: 0.1 }] },
    classical: { name: 'Classical', emoji: '🎻', bands: [{ band: 0, gain: 0.15 }, { band: 6, gain: -0.1 }, { band: 10, gain: 0.1 }, { band: 11, gain: 0.15 }, { band: 12, gain: 0.2 }] },
};

const BASSBOOST_LEVELS = {
    off: { name: 'Off', bands: null },
    low: { name: 'Low', bands: [{ band: 0, gain: 0.1 }, { band: 1, gain: 0.1 }, { band: 2, gain: 0.05 }] },
    medium: { name: 'Medium', bands: [{ band: 0, gain: 0.2 }, { band: 1, gain: 0.2 }, { band: 2, gain: 0.15 }, { band: 3, gain: 0.1 }] },
    high: { name: 'High', bands: [{ band: 0, gain: 0.35 }, { band: 1, gain: 0.35 }, { band: 2, gain: 0.25 }, { band: 3, gain: 0.2 }, { band: 4, gain: 0.15 }] },
    extreme: { name: 'Extreme', bands: [{ band: 0, gain: 0.5 }, { band: 1, gain: 0.5 }, { band: 2, gain: 0.4 }, { band: 3, gain: 0.35 }, { band: 4, gain: 0.25 }, { band: 5, gain: 0.2 }] },
};


export default {
    data: new SlashCommandBuilder()
        .setName('audio')
        .setDescription('🎛️ All audio effects, filters & equalizer in one command')
        .addSubcommand(sub => sub.setName('menu').setDescription('Open the full audio control panel'))
        .addSubcommand(sub => sub.setName('filters').setDescription('Toggle multiple audio filters (multi-select)'))
        .addSubcommand(sub => sub.setName('equalizer')
            .setDescription('Apply equalizer presets')
            .addStringOption(o => o.setName('preset').setDescription('EQ preset').setRequired(false)
                .addChoices(...Object.entries(EQ_PRESETS).map(([k, v]) => ({ name: `${v.emoji} ${v.name}`, value: k }))))
        )
        .addSubcommand(sub => sub.setName('bassboost')
            .setDescription('Apply bass boost')
            .addStringOption(o => o.setName('level').setDescription('Bass boost level').setRequired(false)
                .addChoices(
                    { name: '🔇 Off', value: 'off' }, { name: '🔈 Low', value: 'low' },
                    { name: '🔉 Medium', value: 'medium' }, { name: '🔊 High', value: 'high' },
                    { name: '💥 Extreme', value: 'extreme' }
                ))
        )
        .addSubcommand(sub => sub.setName('nightcore').setDescription('Toggle nightcore effect'))
        .addSubcommand(sub => sub.setName('rotation').setDescription('Toggle 8D audio rotation'))
        .addSubcommand(sub => sub.setName('vaporwave').setDescription('Toggle vaporwave effect'))
        .addSubcommand(sub => sub.setName('speed')
            .setDescription('Change playback speed')
            .addNumberOption(o => o.setName('value').setDescription('Speed (0.25 - 3.0)').setRequired(true).setMinValue(0.25).setMaxValue(3.0))
        )
        .addSubcommand(sub => sub.setName('pitch')
            .setDescription('Change pitch')
            .addNumberOption(o => o.setName('value').setDescription('Pitch (0.5 - 2.0)').setRequired(true).setMinValue(0.5).setMaxValue(2.0))
        )
        .addSubcommand(sub => sub.setName('karaoke').setDescription('Toggle karaoke mode (reduce vocals)'))
        .addSubcommand(sub => sub.setName('tremolo').setDescription('Toggle tremolo effect'))
        .addSubcommand(sub => sub.setName('vibrato').setDescription('Toggle vibrato effect'))
        .addSubcommand(sub => sub.setName('preset')
            .setDescription('Apply a preset effect combination')
            .addStringOption(o => o.setName('name').setDescription('Preset name').setRequired(true)
                .addChoices(...Object.entries(PRESETS).map(([k, v]) => ({ name: `${v.emoji} ${v.name}`, value: k }))))
        )
        .addSubcommand(sub => sub.setName('reset').setDescription('Reset all audio effects'))
        .addSubcommand(sub => sub.setName('status').setDescription('Show currently active effects')),

    category: 'music',
    cooldown: 3,


    async execute(client, interaction) {
        const validation = canUseMusic(interaction, client);
        if (!validation.valid) {
            return interaction.reply({ embeds: [errorEmbed(validation.message)], ephemeral: true });
        }

        const player = client.kazagumo.players.get(interaction.guildId);
        if (!player || !player.queue.current) {
            return interaction.reply({ embeds: [errorEmbed('No music is currently playing.')], ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();

        switch (sub) {
            case 'menu': return handleMenu(client, interaction, player);
            case 'filters': return handleFilters(client, interaction, player);
            case 'equalizer': return handleEqualizer(client, interaction, player);
            case 'bassboost': return handleBassboost(client, interaction, player);
            case 'nightcore': return handleToggle(client, interaction, player, 'nightcore');
            case 'rotation': return handleToggle(client, interaction, player, '8d');
            case 'vaporwave': return handleToggle(client, interaction, player, 'vaporwave');
            case 'karaoke': return handleToggle(client, interaction, player, 'karaoke');
            case 'tremolo': return handleToggle(client, interaction, player, 'tremolo');
            case 'vibrato': return handleToggle(client, interaction, player, 'vibrato');
            case 'speed': return handleSpeed(client, interaction, player);
            case 'pitch': return handlePitch(client, interaction, player);
            case 'preset': return handlePreset(client, interaction, player);
            case 'reset': return handleReset(client, interaction, player);
            case 'status': return handleStatus(client, interaction, player);
        }
    }
};


async function handleMenu(client, interaction, player) {
    const activeFilters = player.data.get('activeFilters') || [];
    const statusText = getActiveEffectsText(player) || 'None active';

    const embed = new EmbedBuilder()
        .setColor(Colors.primary)
        .setAuthor({ name: '🎛️ Audio Control Panel' })
        .setDescription(`**Current Effects:** ${statusText}`)
        .addFields(
            { name: '🎚️ Filters', value: 'Toggle individual audio filters', inline: true },
            { name: '🎭 Presets', value: 'Apply effect combinations', inline: true },
            { name: '📊 Equalizer', value: 'Frequency adjustments', inline: true },
        )
        .setFooter({ text: 'Use the menus below or /audio <subcommand> for quick access' });

    const filterSelect = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('audio_filter_toggle')
            .setPlaceholder('🎚️ Toggle a filter...')
            .addOptions(Object.entries(FILTERS).map(([k, v]) => ({
                label: v.name, description: v.desc, value: k, emoji: v.emoji,
                default: activeFilters.includes(k)
            })))
            .setMinValues(0).setMaxValues(Object.keys(FILTERS).length)
    );

    const presetSelect = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('audio_preset_apply')
            .setPlaceholder('🎭 Apply a preset...')
            .addOptions(Object.entries(PRESETS).map(([k, v]) => ({
                label: v.name, description: v.desc, value: k, emoji: v.emoji
            })))
    );

    const eqSelect = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('audio_eq_apply')
            .setPlaceholder('📊 Select equalizer preset...')
            .addOptions(Object.entries(EQ_PRESETS).map(([k, v]) => ({
                label: v.name, value: k, emoji: v.emoji,
                default: k === (player.data.get('eq') || 'flat')
            })))
    );

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('audio_reset').setLabel('Reset All').setStyle(ButtonStyle.Danger).setEmoji('🔄'),
        new ButtonBuilder().setCustomId('audio_status').setLabel('Status').setStyle(ButtonStyle.Secondary).setEmoji('📊'),
    );

    const response = await interaction.reply({
        embeds: [embed],
        components: [filterSelect, presetSelect, eqSelect, buttons],
        fetchReply: true
    });

    const collector = response.createMessageComponentCollector({ time: 180000 });

    collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) {
            return i.reply({ content: 'This menu is not for you.', ephemeral: true });
        }

        const p = client.kazagumo.players.get(interaction.guildId);
        if (!p || !p.queue.current) {
            return i.update({ components: [], embeds: [errorEmbed('Player no longer active.')] });
        }

        try {
            if (i.customId === 'audio_filter_toggle') {
                const selected = i.values;
                p.data.set('activeFilters', selected);
                await reapplyFilters(p, selected);

                const names = selected.length > 0
                    ? selected.map(k => FILTERS[k]?.name || k).join(', ')
                    : 'None';
                await i.reply({ embeds: [successEmbed(`🎚️ Active filters: **${names}**`)], ephemeral: true });
            }

            else if (i.customId === 'audio_preset_apply') {
                const key = i.values[0];
                const preset = PRESETS[key];
                await p.shoukaku.setFilters(preset.settings);
                p.data.set('activeFilters', []);
                p.data.set('activePreset', key);
                await i.reply({ embeds: [successEmbed(`${preset.emoji} Applied **${preset.name}** preset`)], ephemeral: true });
            }

            else if (i.customId === 'audio_eq_apply') {
                const key = i.values[0];
                const eq = EQ_PRESETS[key];
                if (eq.bands) {
                    await p.shoukaku.setFilters({ equalizer: eq.bands });
                } else {
                    await p.shoukaku.clearFilters();
                }
                p.data.set('eq', key);
                await i.reply({ embeds: [successEmbed(`${eq.emoji} EQ set to **${eq.name}**`)], ephemeral: true });
            }

            else if (i.customId === 'audio_reset') {
                await p.shoukaku.clearFilters();
                clearAllEffectState(p);
                await i.reply({ embeds: [successEmbed('🔄 All audio effects reset')], ephemeral: true });
            }

            else if (i.customId === 'audio_status') {
                const text = getActiveEffectsText(p) || 'No effects active';
                await i.reply({ embeds: [new EmbedBuilder().setColor(Colors.primary).setDescription(`📊 **Active Effects:** ${text}`)], ephemeral: true });
            }
        } catch (error) {
            client.logger.error('Audio menu error:', error);
            await i.reply({ content: '❌ Failed to apply effect.', ephemeral: true }).catch(() => {});
        }
    });

    collector.on('end', async () => {
        try { await response.edit({ components: [] }); } catch (e) {}
    });
}

async function handleFilters(client, interaction, player) {
    const activeFilters = player.data.get('activeFilters') || [];

    const embed = new EmbedBuilder()
        .setColor(Colors.primary)
        .setTitle('🎚️ Audio Filters')
        .setDescription('Select filters to toggle. You can combine multiple!')
        .addFields({
            name: 'Active', value: activeFilters.length > 0
                ? activeFilters.map(k => FILTERS[k]?.name || k).join(', ')
                : 'None'
        });

    const select = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('audio_filter_multi')
            .setPlaceholder('Select filters...')
            .setMinValues(0).setMaxValues(Object.keys(FILTERS).length)
            .addOptions(Object.entries(FILTERS).map(([k, v]) => ({
                label: v.name, description: v.desc, value: k, emoji: v.emoji,
                default: activeFilters.includes(k)
            })))
    );

    const response = await interaction.reply({ embeds: [embed], components: [select], fetchReply: true });

    const collector = response.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async (i) => {
        if (i.user.id !== interaction.user.id) return i.reply({ content: 'Not for you.', ephemeral: true });

        const p = client.kazagumo.players.get(interaction.guildId);
        if (!p) return i.update({ components: [], embeds: [errorEmbed('Player gone.')] });

        const selected = i.values;
        p.data.set('activeFilters', selected);
        await reapplyFilters(p, selected);

        const updatedEmbed = EmbedBuilder.from(embed).setFields({
            name: 'Active', value: selected.length > 0
                ? selected.map(k => FILTERS[k]?.name || k).join(', ')
                : 'None'
        });
        await i.update({ embeds: [updatedEmbed] });
    });

    collector.on('end', async () => { try { await response.edit({ components: [] }); } catch (e) {} });
}

async function handleEqualizer(client, interaction, player) {
    const presetKey = interaction.options.getString('preset');

    if (!presetKey) {
        const current = player.data.get('eq') || 'flat';
        const embed = new EmbedBuilder()
            .setColor(Colors.primary).setTitle('📊 Equalizer')
            .setDescription(`Current: **${EQ_PRESETS[current]?.name || 'Flat'}**`)
            .addFields(Object.entries(EQ_PRESETS).map(([k, v]) => ({
                name: `${v.emoji} ${v.name}`, value: k === current ? '✅' : '⬜', inline: true
            })));

        const select = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder().setCustomId('audio_eq_menu')
                .setPlaceholder('Select EQ preset')
                .addOptions(Object.entries(EQ_PRESETS).map(([k, v]) => ({
                    label: v.name, value: k, emoji: v.emoji, default: k === current
                })))
        );

        const response = await interaction.reply({ embeds: [embed], components: [select], fetchReply: true });
        const collector = response.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) return i.reply({ content: 'Not for you.', ephemeral: true });
            const p = client.kazagumo.players.get(interaction.guildId);
            if (!p) return i.update({ components: [], embeds: [errorEmbed('Player gone.')] });

            const key = i.values[0];
            const eq = EQ_PRESETS[key];
            if (eq.bands) await p.shoukaku.setFilters({ equalizer: eq.bands });
            else await p.shoukaku.clearFilters();
            p.data.set('eq', key);

            const updated = new EmbedBuilder().setColor(Colors.primary).setTitle('📊 Equalizer')
                .setDescription(`Current: **${eq.name}** ✅`)
                .addFields(Object.entries(EQ_PRESETS).map(([k, v]) => ({
                    name: `${v.emoji} ${v.name}`, value: k === key ? '✅' : '⬜', inline: true
                })));
            await i.update({ embeds: [updated] });
        });

        collector.on('end', async () => { try { await response.edit({ components: [] }); } catch (e) {} });
        return;
    }

    const eq = EQ_PRESETS[presetKey];
    if (eq.bands) await player.shoukaku.setFilters({ equalizer: eq.bands });
    else await player.shoukaku.clearFilters();
    player.data.set('eq', presetKey);
    return interaction.reply({ embeds: [successEmbed(`${eq.emoji} EQ set to **${eq.name}**`)] });
}

async function handleBassboost(client, interaction, player) {
    const level = interaction.options.getString('level');

    if (!level) {
        const current = player.data.get('bassboost') || 'off';
        const row = new ActionRowBuilder().addComponents(
            ...Object.entries(BASSBOOST_LEVELS).map(([k, v]) =>
                new ButtonBuilder()
                    .setCustomId(`audio_bass_${k}`)
                    .setLabel(v.name)
                    .setStyle(k === current ? ButtonStyle.Primary : k === 'extreme' ? ButtonStyle.Danger : ButtonStyle.Secondary)
            )
        );

        const embed = new EmbedBuilder().setColor(Colors.primary).setTitle('🔊 Bass Boost')
            .setDescription(`Current: **${BASSBOOST_LEVELS[current].name}**`);

        const response = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        const collector = response.createMessageComponentCollector({ time: 30000 });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) return i.reply({ content: 'Not for you.', ephemeral: true });
            const p = client.kazagumo.players.get(interaction.guildId);
            if (!p) return i.update({ components: [], embeds: [errorEmbed('Player gone.')] });

            const lvl = i.customId.replace('audio_bass_', '');
            const preset = BASSBOOST_LEVELS[lvl];
            if (preset.bands) await p.shoukaku.setFilters({ equalizer: preset.bands });
            else await p.shoukaku.clearFilters();
            p.data.set('bassboost', lvl);

            const emoji = lvl === 'off' ? '🔇' : lvl === 'extreme' ? '💥' : '🔊';
            await i.update({
                embeds: [new EmbedBuilder().setColor(Colors.primary).setTitle('🔊 Bass Boost').setDescription(`Current: **${preset.name}** ${emoji}`)],
                components: [new ActionRowBuilder().addComponents(
                    ...Object.entries(BASSBOOST_LEVELS).map(([k, v]) =>
                        new ButtonBuilder()
                            .setCustomId(`audio_bass_${k}`)
                            .setLabel(v.name)
                            .setStyle(k === lvl ? ButtonStyle.Primary : k === 'extreme' ? ButtonStyle.Danger : ButtonStyle.Secondary)
                    )
                )]
            });
        });

        collector.on('end', async () => { try { await response.edit({ components: [] }); } catch (e) {} });
        return;
    }

    const preset = BASSBOOST_LEVELS[level];
    if (preset.bands) await player.shoukaku.setFilters({ equalizer: preset.bands });
    else await player.shoukaku.clearFilters();
    player.data.set('bassboost', level);
    const emoji = level === 'off' ? '🔇' : level === 'extreme' ? '💥' : '🔊';
    return interaction.reply({ embeds: [successEmbed(`${emoji} Bass boost: **${preset.name}**`)] });
}

async function handleToggle(client, interaction, player, filterKey) {
    const filter = FILTERS[filterKey];
    const isEnabled = player.data.get(filterKey);

    if (isEnabled) {
        const active = (player.data.get('activeFilters') || []).filter(f => f !== filterKey);
        player.data.set('activeFilters', active);
        player.data.set(filterKey, false);

        if (active.length > 0) {
            await reapplyFilters(player, active);
        } else {
            await player.shoukaku.clearFilters();
        }
        return interaction.reply({ embeds: [successEmbed(`${filter.emoji} **${filter.name}** disabled`)] });
    } else {
        const active = player.data.get('activeFilters') || [];
        if (!active.includes(filterKey)) active.push(filterKey);
        player.data.set('activeFilters', active);
        player.data.set(filterKey, true);
        await reapplyFilters(player, active);
        return interaction.reply({ embeds: [successEmbed(`${filter.emoji} **${filter.name}** enabled`)] });
    }
}

async function handleSpeed(client, interaction, player) {
    const speed = interaction.options.getNumber('value');
    const currentPitch = player.data.get('pitch') || 1.0;
    await player.shoukaku.setFilters({ timescale: { speed, pitch: currentPitch, rate: 1.0 } });
    player.data.set('speed', speed);
    return interaction.reply({ embeds: [successEmbed(`⚡ Speed set to **${speed}x**`)] });
}

async function handlePitch(client, interaction, player) {
    const pitch = interaction.options.getNumber('value');
    const currentSpeed = player.data.get('speed') || 1.0;
    await player.shoukaku.setFilters({ timescale: { speed: currentSpeed, pitch, rate: 1.0 } });
    player.data.set('pitch', pitch);
    return interaction.reply({ embeds: [successEmbed(`🎵 Pitch set to **${pitch}x**`)] });
}

async function handlePreset(client, interaction, player) {
    const key = interaction.options.getString('name');
    const preset = PRESETS[key];
    await player.shoukaku.setFilters(preset.settings);
    player.data.set('activePreset', key);
    player.data.set('activeFilters', []);
    return interaction.reply({ embeds: [successEmbed(`${preset.emoji} Applied **${preset.name}** — *${preset.desc}*`)] });
}

async function handleReset(client, interaction, player) {
    await player.shoukaku.clearFilters();
    clearAllEffectState(player);
    return interaction.reply({ embeds: [successEmbed('🔄 All audio effects have been reset')] });
}

async function handleStatus(client, interaction, player) {
    const text = getActiveEffectsText(player) || 'No effects active';
    const embed = new EmbedBuilder()
        .setColor(Colors.primary)
        .setAuthor({ name: '📊 Audio Status' })
        .setDescription(text)
        .setTimestamp();
    return interaction.reply({ embeds: [embed] });
}


async function reapplyFilters(player, activeFilterKeys) {
    if (activeFilterKeys.length === 0) {
        await player.shoukaku.clearFilters();
        return;
    }

    const combined = { equalizer: [] };

    for (const key of activeFilterKeys) {
        const filter = FILTERS[key];
        if (!filter) continue;

        for (const [prop, value] of Object.entries(filter.settings)) {
            if (prop === 'equalizer') {
                for (const band of value) {
                    const existing = combined.equalizer.find(b => b.band === band.band);
                    if (existing) existing.gain = Math.min(1.0, existing.gain + band.gain);
                    else combined.equalizer.push({ ...band });
                }
            } else {
                combined[prop] = value;
            }
        }
    }

    const filters = {};
    if (combined.equalizer.length > 0) filters.equalizer = combined.equalizer;
    if (combined.timescale) filters.timescale = combined.timescale;
    if (combined.rotation) filters.rotation = combined.rotation;
    if (combined.karaoke) filters.karaoke = combined.karaoke;
    if (combined.tremolo) filters.tremolo = combined.tremolo;
    if (combined.vibrato) filters.vibrato = combined.vibrato;
    if (combined.lowPass) filters.lowPass = combined.lowPass;

    await player.shoukaku.setFilters(filters);
}

function clearAllEffectState(player) {
    player.data.set('activeFilters', []);
    player.data.set('activePreset', null);
    player.data.set('eq', 'flat');
    player.data.set('bassboost', 'off');
    player.data.set('nightcore', false);
    player.data.set('vaporwave', false);
    player.data.set('8d', false);
    player.data.set('karaoke', false);
    player.data.set('tremolo', false);
    player.data.set('vibrato', false);
    player.data.set('speed', 1.0);
    player.data.set('pitch', 1.0);
}

function getActiveEffectsText(player) {
    const parts = [];

    const activeFilters = player.data.get('activeFilters') || [];
    if (activeFilters.length > 0) {
        parts.push(`🎚️ Filters: ${activeFilters.map(k => FILTERS[k]?.name || k).join(', ')}`);
    }

    const preset = player.data.get('activePreset');
    if (preset && PRESETS[preset]) {
        parts.push(`🎭 Preset: ${PRESETS[preset].name}`);
    }

    const eq = player.data.get('eq');
    if (eq && eq !== 'flat') {
        parts.push(`📊 EQ: ${EQ_PRESETS[eq]?.name || eq}`);
    }

    const bass = player.data.get('bassboost');
    if (bass && bass !== 'off') {
        parts.push(`🔊 Bass: ${BASSBOOST_LEVELS[bass]?.name || bass}`);
    }

    const speed = player.data.get('speed');
    if (speed && speed !== 1.0) parts.push(`⚡ Speed: ${speed}x`);

    const pitch = player.data.get('pitch');
    if (pitch && pitch !== 1.0) parts.push(`🎵 Pitch: ${pitch}x`);

    return parts.length > 0 ? parts.join('\n') : null;
}
