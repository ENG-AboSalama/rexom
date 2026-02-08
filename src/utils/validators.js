export function isInVoiceChannel(member) {
    return !!member.voice?.channel;
}

/**
 * Check if user is in the same voice channel as bot
 */
export function isInSameVoiceChannel(member, player) {
    if (!member.voice?.channel) return false;
    return member.voice.channel.id === player?.voiceId;
}

/**
 * Check if user has DJ permissions
 */
export function hasDJPermissions(member, settings) {
    if (process.env.OWNER_IDS?.split(',').includes(member.id)) return true;
    
    if (member.permissions.has('Administrator')) return true;
    
    if (!settings?.dj_enabled) return true;
    
    if (settings.dj_role) {
        return member.roles.cache.has(settings.dj_role);
    }
    
    return true;
}

/**
 * Check if user can use music commands
 * Accepts either an interaction or a member object
 */
export function canUseMusic(interactionOrMember, clientOrPlayer, settings = {}) {
    const member = interactionOrMember.member || interactionOrMember;
    const player = clientOrPlayer?.kazagumo 
        ? clientOrPlayer.kazagumo.players?.get(interactionOrMember.guildId) 
        : clientOrPlayer;
    
    if (clientOrPlayer?.kazagumo && interactionOrMember.guildId) {
        settings = clientOrPlayer.db?.getGuildSettings?.(interactionOrMember.guildId) || settings;
    }

    const errorMessages = {
        notInVoice: 'You need to be in a voice channel to use this command.',
        sameVoice: 'You need to be in the same voice channel as me.',
        noDJ: 'You need the DJ role to use this command.',
    };
    
    if (!isInVoiceChannel(member)) {
        return { valid: false, errors: ['notInVoice'], message: errorMessages.notInVoice };
    }
    
    if (player && !isInSameVoiceChannel(member, player)) {
        return { valid: false, errors: ['sameVoice'], message: errorMessages.sameVoice };
    }
    
    if (!hasDJPermissions(member, settings)) {
        return { valid: false, errors: ['noDJ'], message: errorMessages.noDJ };
    }
    
    return { valid: true, errors: [], message: null };
}

/**
 * Check if the bot can join the voice channel
 */
export function canJoinVoice(channel, member) {
    const permissions = channel.permissionsFor(member.guild.members.me);
    
    const required = ['ViewChannel', 'Connect', 'Speak'];
    const missing = required.filter(p => !permissions.has(p));
    
    return {
        canJoin: missing.length === 0,
        missing
    };
}

/**
 * Check if the bot can send messages in channel
 */
export function canSendMessages(channel) {
    const permissions = channel.permissionsFor(channel.guild.members.me);
    
    return permissions.has('SendMessages') && permissions.has('EmbedLinks');
}

/**
 * Validate URL
 */
export function isValidURL(string) {
    try {
        new URL(string);
        return true;
    } catch {
        return false;
    }
}

/**
 * Parse time string to milliseconds
 */
export function parseTime(time) {
    if (typeof time === 'number') return time;
    if (!time) return 0;
    
    const parts = time.split(':').reverse();
    let ms = 0;
    
    if (parts[0]) ms += parseInt(parts[0]) * 1000;         // Seconds
    if (parts[1]) ms += parseInt(parts[1]) * 60 * 1000;    // Minutes
    if (parts[2]) ms += parseInt(parts[2]) * 60 * 60 * 1000; // Hours
    
    return ms;
}

/**
 * Truncate string
 */
export function truncate(str, length = 50) {
    if (!str) return '';
    if (str.length <= length) return str;
    return str.substring(0, length - 3) + '...';
}

/**
 * Shuffle array
 */
export function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Sleep function
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format number with commas
 */
export function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Get source emoji
 */
export function getSourceEmoji(source) {
    const sources = {
        youtube: '<:youtube:1234567890>',
        spotify: '<:spotify:1234567890>',
        soundcloud: '<:soundcloud:1234567890>',
        twitch: '<:twitch:1234567890>',
        bandcamp: '🎵',
        vimeo: '📹',
        http: '🌐',
    };
    
    return sources[source?.toLowerCase()] || '🎵';
}
