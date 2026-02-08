export const AUDIO_PRESETS = {
    '3d': {
        name: '3D Audio',
        emoji: '🎧',
        description: 'Immersive 3D spatial effect',
        rotation: { rotationHz: 0.2 }
    },
    surround: {
        name: 'Surround Sound',
        emoji: '🔊',
        description: 'Wide stereo surround effect',
        tremolo: { frequency: 4, depth: 0.3 },
        rotation: { rotationHz: 0.1 }
    },

    chipmunk: {
        name: 'Chipmunk',
        emoji: '🐿️',
        description: 'High pitched voice',
        timescale: { pitch: 1.5, rate: 1.0, speed: 1.0 }
    },
    deep: {
        name: 'Deep Voice',
        emoji: '🗿',
        description: 'Low pitched deep voice',
        timescale: { pitch: 0.7, rate: 1.0, speed: 1.0 }
    },
    robot: {
        name: 'Robot',
        emoji: '🤖',
        description: 'Robotic voice effect',
        vibrato: { frequency: 14, depth: 1 },
        timescale: { pitch: 0.9, rate: 1.0, speed: 1.0 }
    },

    lofi: {
        name: 'Lo-Fi',
        emoji: '📻',
        description: 'Vintage lo-fi aesthetic',
        equalizer: [
            { band: 0, gain: 0.2 },
            { band: 1, gain: 0.15 },
            { band: 12, gain: -0.2 },
            { band: 13, gain: -0.25 },
            { band: 14, gain: -0.3 }
        ],
        tremolo: { frequency: 2, depth: 0.1 }
    },
    theater: {
        name: 'Theater',
        emoji: '🎭',
        description: 'Cinema-like audio experience',
        equalizer: [
            { band: 0, gain: 0.25 },
            { band: 1, gain: 0.2 },
            { band: 5, gain: 0.1 },
            { band: 6, gain: 0.15 },
            { band: 7, gain: 0.1 },
            { band: 13, gain: 0.15 },
            { band: 14, gain: 0.2 }
        ]
    },
    concert: {
        name: 'Concert Hall',
        emoji: '🏟️',
        description: 'Live concert atmosphere',
        equalizer: [
            { band: 0, gain: 0.3 },
            { band: 1, gain: 0.25 },
            { band: 2, gain: 0.2 },
            { band: 10, gain: 0.15 },
            { band: 11, gain: 0.2 },
            { band: 12, gain: 0.25 }
        ],
        tremolo: { frequency: 1.5, depth: 0.15 }
    },

    slowed: {
        name: 'Slowed + Reverb',
        emoji: '🌊',
        description: 'Slowed down with reverb feel',
        timescale: { speed: 0.85, pitch: 0.95, rate: 1.0 },
        tremolo: { frequency: 1.5, depth: 0.2 }
    },
    spedup: {
        name: 'Sped Up',
        emoji: '⚡',
        description: 'Faster tempo version',
        timescale: { speed: 1.25, pitch: 1.05, rate: 1.0 }
    },
    daycore: {
        name: 'Daycore',
        emoji: '☀️',
        description: 'Faster and brighter',
        timescale: { speed: 1.2, pitch: 1.15, rate: 1.0 }
    },

    phonk: {
        name: 'Phonk',
        emoji: '🚗',
        description: 'Memphis phonk style',
        equalizer: [
            { band: 0, gain: 0.4 },
            { band: 1, gain: 0.35 },
            { band: 2, gain: 0.25 },
            { band: 13, gain: -0.2 },
            { band: 14, gain: -0.3 }
        ],
        timescale: { speed: 0.9, pitch: 0.95, rate: 1.0 }
    },
    metal: {
        name: 'Metal',
        emoji: '🤘',
        description: 'Heavy metal enhancement',
        equalizer: [
            { band: 0, gain: 0.3 },
            { band: 3, gain: 0.2 },
            { band: 5, gain: 0.15 },
            { band: 7, gain: 0.25 },
            { band: 10, gain: 0.2 },
            { band: 12, gain: 0.3 }
        ]
    },
    jazz: {
        name: 'Jazz Club',
        emoji: '🎷',
        description: 'Warm jazz tone',
        equalizer: [
            { band: 0, gain: 0.15 },
            { band: 1, gain: 0.1 },
            { band: 5, gain: 0.2 },
            { band: 6, gain: 0.25 },
            { band: 7, gain: 0.2 },
            { band: 12, gain: 0.1 }
        ]
    }
};

export const EQ_BANDS = [
    { band: 0, freq: '25 Hz' },
    { band: 1, freq: '40 Hz' },
    { band: 2, freq: '63 Hz' },
    { band: 3, freq: '100 Hz' },
    { band: 4, freq: '160 Hz' },
    { band: 5, freq: '250 Hz' },
    { band: 6, freq: '400 Hz' },
    { band: 7, freq: '630 Hz' },
    { band: 8, freq: '1 kHz' },
    { band: 9, freq: '1.6 kHz' },
    { band: 10, freq: '2.5 kHz' },
    { band: 11, freq: '4 kHz' },
    { band: 12, freq: '6.3 kHz' },
    { band: 13, freq: '10 kHz' },
    { band: 14, freq: '16 kHz' }
];

/**
 * Audio Effects Manager class
 */
export class AudioEffectsManager {
    constructor(client) {
        this.client = client;
        this.activeEffects = new Map(); // guildId -> active effects
    }

    /**
     * Apply a preset to a player
     * @param {Object} player - Kazagumo player
     * @param {string} presetName - Preset name
     */
    async applyPreset(player, presetName) {
        const preset = AUDIO_PRESETS[presetName];
        if (!preset) return false;

        try {
            this.activeEffects.set(player.guildId, presetName);

            if (preset.equalizer) {
                await player.setEqualizer(preset.equalizer);
            }
            if (preset.timescale) {
                await player.setTimescale(preset.timescale);
            }
            if (preset.tremolo) {
                await player.setTremolo(preset.tremolo);
            }
            if (preset.vibrato) {
                await player.setVibrato(preset.vibrato);
            }
            if (preset.rotation) {
                await player.setRotation(preset.rotation);
            }
            if (preset.karaoke) {
                await player.setKaraoke(preset.karaoke);
            }

            return true;
        } catch (error) {
            this.client.logger.error('Failed to apply audio preset:', error);
            return false;
        }
    }

    /**
     * Clear all effects from a player
     * @param {Object} player - Kazagumo player
     */
    async clearEffects(player) {
        try {
            await player.shoukaku.clearFilters();
            this.activeEffects.delete(player.guildId);
            return true;
        } catch (error) {
            this.client.logger.error('Failed to clear audio effects:', error);
            return false;
        }
    }

    /**
     * Get currently active preset for a guild
     * @param {string} guildId - Guild ID
     */
    getActivePreset(guildId) {
        return this.activeEffects.get(guildId) || null;
    }

    /**
     * Get all available presets
     */
    getPresets() {
        return Object.entries(AUDIO_PRESETS).map(([key, preset]) => ({
            id: key,
            name: preset.name,
            emoji: preset.emoji,
            description: preset.description
        }));
    }

    /**
     * Create custom EQ settings
     * @param {Object} player - Kazagumo player
     * @param {Array} bands - Array of {band, gain} objects
     */
    async setCustomEQ(player, bands) {
        try {
            const validBands = bands.filter(b => 
                b.band >= 0 && b.band <= 14 && 
                b.gain >= -0.25 && b.gain <= 1
            );
            
            await player.setEqualizer(validBands);
            return true;
        } catch (error) {
            this.client.logger.error('Failed to set custom EQ:', error);
            return false;
        }
    }

    /**
     * Apply bassboost with custom level
     * @param {Object} player - Kazagumo player
     * @param {number} level - Boost level (0-5)
     */
    async setBassBoost(player, level) {
        const gains = {
            0: 0,
            1: 0.1,
            2: 0.2,
            3: 0.3,
            4: 0.4,
            5: 0.5
        };

        const gain = gains[level] || 0;
        
        const bands = [
            { band: 0, gain: gain },
            { band: 1, gain: gain * 0.9 },
            { band: 2, gain: gain * 0.8 },
            { band: 3, gain: gain * 0.6 },
            { band: 4, gain: gain * 0.4 },
            { band: 5, gain: gain * 0.2 }
        ];

        return this.setCustomEQ(player, bands);
    }

    /**
     * Set playback speed
     * @param {Object} player - Kazagumo player
     * @param {number} speed - Speed multiplier (0.5-2.0)
     */
    async setSpeed(player, speed) {
        const clampedSpeed = Math.max(0.5, Math.min(2.0, speed));
        
        try {
            await player.setTimescale({ speed: clampedSpeed, pitch: 1.0, rate: 1.0 });
            return true;
        } catch (error) {
            this.client.logger.error('Failed to set speed:', error);
            return false;
        }
    }

    /**
     * Set pitch
     * @param {Object} player - Kazagumo player
     * @param {number} pitch - Pitch multiplier (0.5-2.0)
     */
    async setPitch(player, pitch) {
        const clampedPitch = Math.max(0.5, Math.min(2.0, pitch));
        
        try {
            await player.setTimescale({ speed: 1.0, pitch: clampedPitch, rate: 1.0 });
            return true;
        } catch (error) {
            this.client.logger.error('Failed to set pitch:', error);
            return false;
        }
    }
}

export default AudioEffectsManager;
