import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const Colors = {
    Primary: 0xe94560,
    Secondary: 0xff6b6b,
    Success: 0x00d26a,
    Warning: 0xffc107,
    Error: 0xff4757,
    Info: 0x3498db,
    Music: 0xe94560,
    Neutral: 0x808080,
    primary: 0xe94560,
    secondary: 0xff6b6b,
    success: 0x00d26a,
    warning: 0xffc107,
    error: 0xff4757,
    info: 0x3498db,
    music: 0xe94560,
    neutral: 0x808080,
};

export const Translations = {
    en: {
        nowPlaying: 'Now Playing',
        addedToQueue: 'Added to Queue',
        queueEmpty: 'Queue is empty',
        noPlayer: 'No music is playing',
        notInVoice: 'You need to be in a voice channel',
        sameVoice: 'You need to be in the same voice channel as me',
        paused: 'Paused',
        resumed: 'Resumed',
        skipped: 'Skipped',
        stopped: 'Stopped',
        volume: 'Volume',
        loop: 'Loop',
        shuffle: 'Shuffle',
        queue: 'Queue',
        duration: 'Duration',
        requestedBy: 'Requested by',
        position: 'Position in queue',
        noResults: 'No results found',
        playlistSaved: 'Playlist saved',
        playlistLoaded: 'Playlist loaded',
        playlistDeleted: 'Playlist deleted',
        error: 'Error',
        success: 'Success',
    },
    ar: {
        nowPlaying: 'يتم تشغيل الآن',
        addedToQueue: 'تمت الإضافة للقائمة',
        queueEmpty: 'القائمة فارغة',
        noPlayer: 'لا يوجد موسيقى قيد التشغيل',
        notInVoice: 'يجب أن تكون في قناة صوتية',
        sameVoice: 'يجب أن تكون في نفس القناة الصوتية',
        paused: 'تم الإيقاف المؤقت',
        resumed: 'تم الاستئناف',
        skipped: 'تم التخطي',
        stopped: 'تم الإيقاف',
        volume: 'مستوى الصوت',
        loop: 'تكرار',
        shuffle: 'خلط',
        queue: 'القائمة',
        duration: 'المدة',
        requestedBy: 'طلب بواسطة',
        position: 'الموضع في القائمة',
        noResults: 'لا توجد نتائج',
        playlistSaved: 'تم حفظ قائمة التشغيل',
        playlistLoaded: 'تم تحميل قائمة التشغيل',
        playlistDeleted: 'تم حذف قائمة التشغيل',
        error: 'خطأ',
        success: 'نجاح',
    }
};

/**
 * Get translation
 */
export function t(key, lang = 'en') {
    return Translations[lang]?.[key] || Translations.en[key] || key;
}

/**
 * Format duration from milliseconds
 */
export function formatDuration(ms) {
    if (!ms || ms === 0) return 'Live';
    
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Create progress bar
 */
export function createProgressBar(current, total, length = 15) {
    if (!total || total === 0) return '▬'.repeat(length);
    
    const progress = Math.round((current / total) * length);
    const empty = length - progress;
    
    return '▰'.repeat(progress) + '▱'.repeat(empty);
}

/**
 * Create Now Playing embed
 */
export function createNowPlayingEmbed(track, player, lang = 'en') {
    const position = player.position || 0;
    const duration = track.length || 0;
    const isLive = track.isStream || duration === 0;

    const progressBar = isLive 
        ? '🔴 LIVE' 
        : `${createProgressBar(position, duration)} \`${formatDuration(position)} / ${formatDuration(duration)}\``;

    const embed = new EmbedBuilder()
        .setColor(Colors.Music)
        .setAuthor({
            name: t('nowPlaying', lang),
            iconURL: 'https://cdn.discordapp.com/emojis/741605543046807626.gif'
        })
        .setTitle(track.title)
        .setURL(track.uri)
        .setDescription(progressBar)
        .setThumbnail(track.thumbnail || null)
        .addFields(
            {
                name: '👤 Artist',
                value: track.author || 'Unknown',
                inline: true
            },
            {
                name: '⏱️ Duration',
                value: isLive ? '🔴 Live' : formatDuration(duration),
                inline: true
            },
            {
                name: '🔊 Volume',
                value: `${player.volume}%`,
                inline: true
            }
        )
        .setTimestamp();

    if (track.requester) {
        embed.setFooter({
            text: `${t('requestedBy', lang)}: ${track.requester.username}`,
            iconURL: track.requester.displayAvatarURL()
        });
    }

    const status = [];
    if (player.loop === 'track') status.push('🔂 Loop: Track');
    if (player.loop === 'queue') status.push('🔁 Loop: Queue');
    if (player.paused) status.push('⏸️ Paused');

    if (status.length > 0) {
        embed.addFields({ name: '📊 Status', value: status.join(' • '), inline: false });
    }

    return embed;
}

/**
 * Create music control buttons
 */
export function createMusicButtons(player, lang = 'en') {
    const isPaused = player.paused;
    const loop = player.loop || 'none';

    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('music_previous')
                .setEmoji('⏮️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_playpause')
                .setEmoji(isPaused ? '▶️' : '⏸️')
                .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('music_skip')
                .setEmoji('⏭️')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('music_stop')
                .setEmoji('⏹️')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('music_loop')
                .setEmoji(loop === 'track' ? '🔂' : loop === 'queue' ? '🔁' : '➡️')
                .setStyle(loop !== 'none' ? ButtonStyle.Success : ButtonStyle.Secondary)
        );
}

/**
 * Create queue embed
 */
export function createQueueEmbed(player, page = 0, lang = 'en') {
    const queue = player.queue;
    const current = queue.current;
    const tracks = [...queue];
    
    const itemsPerPage = 10;
    const totalPages = Math.ceil(tracks.length / itemsPerPage) || 1;
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    
    const embed = new EmbedBuilder()
        .setColor(Colors.Music)
        .setTitle(`📋 ${t('queue', lang)} - ${player.queue.size + 1} tracks`)
        .setTimestamp();

    if (current) {
        embed.setDescription(
            `**Now Playing:**\n` +
            `[${current.title}](${current.uri}) \`[${formatDuration(current.length)}]\`\n` +
            `${t('requestedBy', lang)}: ${current.requester?.username || 'Unknown'}\n\n` +
            `**Up Next:**`
        );
    }

    if (tracks.length > 0) {
        const pageContent = tracks.slice(start, end)
            .map((track, i) => 
                `\`${start + i + 1}.\` [${track.title.substring(0, 40)}${track.title.length > 40 ? '...' : ''}](${track.uri}) \`[${formatDuration(track.length)}]\``
            )
            .join('\n');

        embed.addFields({ name: '\u200b', value: pageContent || 'No tracks in queue' });
    } else {
        embed.addFields({ name: '\u200b', value: '*No more tracks in queue*' });
    }

    const totalDuration = tracks.reduce((acc, t) => acc + (t.length || 0), current?.length || 0);
    embed.setFooter({
        text: `Page ${page + 1}/${totalPages} • Total Duration: ${formatDuration(totalDuration)}`
    });

    return embed;
}

/**
 * Create queue pagination buttons
 */
export function createQueueButtons(page, totalPages) {
    return new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`queue_first`)
                .setEmoji('⏪')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId(`queue_prev`)
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId(`queue_page`)
                .setLabel(`${page + 1}/${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId(`queue_next`)
                .setEmoji('▶️')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page >= totalPages - 1),
            new ButtonBuilder()
                .setCustomId(`queue_last`)
                .setEmoji('⏩')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= totalPages - 1)
        );
}

/**
 * Create success embed
 */
export function successEmbed(description, lang = 'en') {
    return new EmbedBuilder()
        .setColor(Colors.Success)
        .setDescription(`✅ ${description}`);
}

/**
 * Create error embed
 */
export function errorEmbed(description, lang = 'en') {
    return new EmbedBuilder()
        .setColor(Colors.Error)
        .setDescription(`❌ ${description}`);
}

/**
 * Create info embed
 */
export function infoEmbed(description, lang = 'en') {
    return new EmbedBuilder()
        .setColor(Colors.Info)
        .setDescription(`ℹ️ ${description}`);
}

/**
 * Create warning embed
 */
export function warningEmbed(description, lang = 'en') {
    return new EmbedBuilder()
        .setColor(Colors.Warning)
        .setDescription(`⚠️ ${description}`);
}
