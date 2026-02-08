export class AIRecommendations {
    constructor(client) {
        this.client = client;
    }

    /**
     * Get personalized recommendations based on user's listening history
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID (optional, for server-specific recommendations)
     * @param {number} limit - Number of recommendations to return
     */
    async getPersonalRecommendations(userId, guildId = null, limit = 10) {
        try {
            const history = this.#getUserListeningHistory(userId, guildId, 100);
            
            if (history.length === 0) {
                return { tracks: [], message: 'Not enough listening history' };
            }

            const analysis = this.#analyzeListeningPatterns(history);
            
            const searchQueries = this.#generateSearchQueries(analysis);
            
            const recommendations = await this.#searchRecommendations(searchQueries, history, limit);

            return {
                tracks: recommendations,
                analysis: {
                    topArtists: analysis.topArtists.slice(0, 5),
                    topGenres: analysis.genres.slice(0, 5),
                    listeningPatterns: analysis.patterns
                }
            };
        } catch (error) {
            this.client.logger.error('AI Recommendations error:', error);
            return { tracks: [], message: 'Failed to generate recommendations' };
        }
    }

    /**
     * Get recommendations similar to a specific track
     * @param {Object} track - Track object with title and author
     * @param {number} limit - Number of recommendations
     */
    async getSimilarTracks(track, limit = 10) {
        const queries = [
            `${track.author} similar artists`,
            `${track.title} ${track.author} mix`,
            `songs like ${track.title}`,
            `${track.author} best songs`
        ];

        const allTracks = [];
        
        for (const query of queries.slice(0, 2)) {
            try {
                const result = await this.client.kazagumo.search(query, {
                    engine: 'youtube'
                });
                
                const filtered = result.tracks.filter(t => 
                    t.uri !== track.uri && 
                    !t.title.toLowerCase().includes(track.title.toLowerCase().substring(0, 20))
                );
                
                allTracks.push(...filtered);
            } catch (e) {
            }
        }

        const seen = new Set();
        const unique = allTracks.filter(t => {
            const key = t.uri;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        return unique.slice(0, limit);
    }

    /**
     * Get mood-based recommendations
     * @param {string} mood - Mood type (happy, sad, energetic, chill, etc.)
     * @param {number} limit - Number of recommendations
     */
    async getMoodBasedRecommendations(mood, limit = 10) {
        const moodQueries = {
            happy: ['happy upbeat songs 2024', 'feel good music playlist', 'summer vibes songs'],
            sad: ['emotional songs', 'sad songs playlist', 'heartbreak songs'],
            energetic: ['workout music 2024', 'high energy songs', 'pump up music'],
            chill: ['lofi chill beats', 'relaxing music', 'ambient chill songs'],
            romantic: ['love songs playlist', 'romantic music', 'romantic songs 2024'],
            party: ['party hits 2024', 'dance music playlist', 'club bangers'],
            focus: ['study music', 'concentration music', 'instrumental focus'],
            sleep: ['sleep music', 'peaceful sleep sounds', 'calming night music']
        };

        const queries = moodQueries[mood.toLowerCase()] || [`${mood} music playlist`];
        
        const allTracks = [];
        
        for (const query of queries) {
            try {
                const result = await this.client.kazagumo.search(query, {
                    engine: 'youtube'
                });
                allTracks.push(...result.tracks.slice(0, 5));
            } catch (e) {
            }
        }

        return this.#shuffleArray(allTracks).slice(0, limit);
    }

    /**
     * Get trending tracks
     * @param {string} region - Region code (optional)
     * @param {number} limit - Number of tracks
     */
    async getTrendingTracks(region = 'global', limit = 10) {
        const queries = [
            'top songs this week 2024',
            'trending music 2024',
            'viral songs 2024',
            'top 40 hits'
        ];

        const allTracks = [];
        
        for (const query of queries.slice(0, 2)) {
            try {
                const result = await this.client.kazagumo.search(query, {
                    engine: 'youtube'
                });
                allTracks.push(...result.tracks.slice(0, 10));
            } catch (e) {
            }
        }

        const seen = new Set();
        const unique = allTracks.filter(t => {
            const key = t.uri;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        return unique.slice(0, limit);
    }

    /**
     * Generate a smart playlist based on seed tracks
     * @param {Array} seedTracks - Array of track objects to base playlist on
     * @param {number} targetLength - Target number of tracks
     */
    async generateSmartPlaylist(seedTracks, targetLength = 20) {
        if (!seedTracks || seedTracks.length === 0) {
            return [];
        }

        const playlist = [...seedTracks];
        const usedArtists = new Set(seedTracks.map(t => t.author?.toLowerCase()));
        
        for (const seed of seedTracks.slice(0, 3)) {
            const similar = await this.getSimilarTracks(seed, 10);
            
            for (const track of similar) {
                if (playlist.length >= targetLength) break;
                
                const artistKey = track.author?.toLowerCase();
                const artistCount = playlist.filter(t => 
                    t.author?.toLowerCase() === artistKey
                ).length;
                
                if (artistCount < 3 && !playlist.some(t => t.uri === track.uri)) {
                    playlist.push(track);
                }
            }
        }

        const seeds = playlist.slice(0, seedTracks.length);
        const generated = this.#shuffleArray(playlist.slice(seedTracks.length));
        
        return [...seeds, ...generated].slice(0, targetLength);
    }

    /**
     * Get discover weekly style recommendations
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     */
    async getDiscoverWeekly(userId, guildId) {
        const personal = await this.getPersonalRecommendations(userId, guildId, 15);
        const trending = await this.getTrendingTracks('global', 5);
        
        const combined = [...personal.tracks, ...trending];
        return this.#shuffleArray(combined).slice(0, 20);
    }


    #getUserListeningHistory(userId, guildId, limit) {
        try {
            let query;
            if (guildId) {
                query = this.client.db.db.prepare(`
                    SELECT title, uri, source, played_at
                    FROM song_history 
                    WHERE user_id = ? AND guild_id = ?
                    ORDER BY played_at DESC 
                    LIMIT ?
                `);
                return query.all(userId, guildId, limit);
            } else {
                query = this.client.db.db.prepare(`
                    SELECT title, uri, source, played_at
                    FROM song_history 
                    WHERE user_id = ?
                    ORDER BY played_at DESC 
                    LIMIT ?
                `);
                return query.all(userId, limit);
            }
        } catch (e) {
            return [];
        }
    }

    #analyzeListeningPatterns(history) {
        const artistCounts = {};
        const titleWords = {};
        const sources = {};
        const hourCounts = Array(24).fill(0);

        for (const track of history) {
            const parts = track.title?.split(' - ') || [];
            const artist = parts[0]?.trim() || 'Unknown';
            
            artistCounts[artist] = (artistCounts[artist] || 0) + 1;
            sources[track.source || 'youtube'] = (sources[track.source || 'youtube'] || 0) + 1;

            const words = track.title?.toLowerCase().split(/\s+/) || [];
            for (const word of words) {
                if (word.length > 3) {
                    titleWords[word] = (titleWords[word] || 0) + 1;
                }
            }

            if (track.played_at) {
                const date = new Date(track.played_at);
                const hour = date.getHours();
                hourCounts[hour]++;
            }
        }

        const topArtists = Object.entries(artistCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({ name, count }));

        const genreKeywords = {
            'pop': ['pop', 'dance', 'hit', 'chart'],
            'rock': ['rock', 'metal', 'guitar', 'band'],
            'hiphop': ['rap', 'hip', 'hop', 'trap', 'beat'],
            'electronic': ['edm', 'house', 'techno', 'remix', 'dj'],
            'rnb': ['rnb', 'soul', 'r&b', 'groove'],
            'latin': ['reggaeton', 'latin', 'spanish', 'bachata'],
            'classical': ['classical', 'orchestra', 'symphony', 'piano'],
            'jazz': ['jazz', 'blues', 'swing']
        };

        const genres = [];
        for (const [genre, keywords] of Object.entries(genreKeywords)) {
            const count = keywords.reduce((sum, kw) => sum + (titleWords[kw] || 0), 0);
            if (count > 0) {
                genres.push({ name: genre, score: count });
            }
        }
        genres.sort((a, b) => b.score - a.score);

        const peakHours = hourCounts
            .map((count, hour) => ({ hour, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);

        return {
            topArtists,
            genres,
            sources: Object.entries(sources).map(([name, count]) => ({ name, count })),
            patterns: {
                peakHours,
                totalTracks: history.length
            }
        };
    }

    #generateSearchQueries(analysis) {
        const queries = [];
        
        for (const artist of analysis.topArtists.slice(0, 3)) {
            queries.push(`${artist.name} mix`);
            queries.push(`artists like ${artist.name}`);
        }

        for (const genre of analysis.genres.slice(0, 2)) {
            queries.push(`best ${genre.name} songs 2024`);
        }

        queries.push('new music this week');
        queries.push('trending songs');

        return queries;
    }

    async #searchRecommendations(queries, history, limit) {
        const historyUris = new Set(history.map(h => h.uri));
        const allTracks = [];

        for (const query of queries.slice(0, 5)) {
            try {
                const result = await this.client.kazagumo.search(query, {
                    engine: 'youtube'
                });
                
                const newTracks = result.tracks.filter(t => !historyUris.has(t.uri));
                allTracks.push(...newTracks.slice(0, 5));
            } catch (e) {
            }
        }

        const seen = new Set();
        const unique = allTracks.filter(t => {
            if (seen.has(t.uri)) return false;
            seen.add(t.uri);
            return true;
        });

        return this.#shuffleArray(unique).slice(0, limit);
    }

    #shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
}

export default AIRecommendations;
