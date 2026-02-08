export class DeezerAPI {
    constructor() {
        this.baseUrl = 'https://api.deezer.com';
    }

    /**
     * Search tracks on Deezer
     * @param {string} query - Search query
     * @param {number} limit - Number of results
     */
    async search(query, limit = 10) {
        try {
            const response = await fetch(
                `${this.baseUrl}/search?q=${encodeURIComponent(query)}&limit=${limit}`
            );
            
            if (!response.ok) {
                throw new Error(`Deezer API error: ${response.status}`);
            }

            const data = await response.json();
            
            return data.data?.map(track => ({
                title: track.title,
                author: track.artist?.name || 'Unknown Artist',
                duration: track.duration * 1000, // Convert to ms
                thumbnail: track.album?.cover_medium || track.album?.cover,
                uri: track.link,
                deezerPreview: track.preview,
                isrc: track.isrc,
                album: track.album?.title,
                source: 'deezer'
            })) || [];
        } catch (error) {
            console.error('Deezer search error:', error);
            return [];
        }
    }

    /**
     * Get track by ISRC
     * @param {string} isrc - ISRC code
     */
    async getByIsrc(isrc) {
        try {
            const response = await fetch(`${this.baseUrl}/track/isrc:${isrc}`);
            
            if (!response.ok) return null;

            const track = await response.json();
            if (track.error) return null;

            return {
                title: track.title,
                author: track.artist?.name,
                duration: track.duration * 1000,
                thumbnail: track.album?.cover_medium,
                uri: track.link,
                album: track.album?.title,
                source: 'deezer'
            };
        } catch {
            return null;
        }
    }

    /**
     * Get chart/top tracks
     * @param {number} limit - Number of tracks
     */
    async getChart(limit = 25) {
        try {
            const response = await fetch(`${this.baseUrl}/chart/0/tracks?limit=${limit}`);
            
            if (!response.ok) return [];

            const data = await response.json();
            
            return data.data?.map(track => ({
                title: track.title,
                author: track.artist?.name,
                duration: track.duration * 1000,
                thumbnail: track.album?.cover_medium,
                uri: track.link,
                position: track.position,
                source: 'deezer'
            })) || [];
        } catch {
            return [];
        }
    }

    /**
     * Get artist info
     * @param {string} artistName - Artist name
     */
    async getArtist(artistName) {
        try {
            const response = await fetch(
                `${this.baseUrl}/search/artist?q=${encodeURIComponent(artistName)}&limit=1`
            );
            
            if (!response.ok) return null;

            const data = await response.json();
            const artist = data.data?.[0];
            
            if (!artist) return null;

            return {
                id: artist.id,
                name: artist.name,
                picture: artist.picture_medium,
                fans: artist.nb_fan,
                link: artist.link
            };
        } catch {
            return null;
        }
    }

    /**
     * Get artist's top tracks
     * @param {string} artistName - Artist name
     * @param {number} limit - Number of tracks
     */
    async getArtistTopTracks(artistName, limit = 10) {
        try {
            const artist = await this.getArtist(artistName);
            if (!artist) return [];

            const response = await fetch(`${this.baseUrl}/artist/${artist.id}/top?limit=${limit}`);
            
            if (!response.ok) return [];

            const data = await response.json();
            
            return data.data?.map(track => ({
                title: track.title,
                author: track.artist?.name,
                duration: track.duration * 1000,
                thumbnail: track.album?.cover_medium,
                uri: track.link,
                source: 'deezer'
            })) || [];
        } catch {
            return [];
        }
    }
}

/**
 * Apple Music Integration (Metadata only - no streaming)
 * Uses iTunes Search API
 */
export class AppleMusicAPI {
    constructor() {
        this.baseUrl = 'https://itunes.apple.com';
    }

    /**
     * Search tracks
     * @param {string} query - Search query
     * @param {number} limit - Number of results
     */
    async search(query, limit = 10) {
        try {
            const response = await fetch(
                `${this.baseUrl}/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}`
            );
            
            if (!response.ok) return [];

            const data = await response.json();
            
            return data.results?.map(track => ({
                title: track.trackName,
                author: track.artistName,
                duration: track.trackTimeMillis,
                thumbnail: track.artworkUrl100?.replace('100x100', '300x300'),
                uri: track.trackViewUrl,
                album: track.collectionName,
                releaseDate: track.releaseDate,
                genre: track.primaryGenreName,
                source: 'apple'
            })) || [];
        } catch {
            return [];
        }
    }

    /**
     * Get artist info
     * @param {string} artistName - Artist name
     */
    async getArtist(artistName) {
        try {
            const response = await fetch(
                `${this.baseUrl}/search?term=${encodeURIComponent(artistName)}&media=music&entity=musicArtist&limit=1`
            );
            
            if (!response.ok) return null;

            const data = await response.json();
            const artist = data.results?.[0];
            
            if (!artist) return null;

            return {
                id: artist.artistId,
                name: artist.artistName,
                link: artist.artistLinkUrl,
                genre: artist.primaryGenreName
            };
        } catch {
            return null;
        }
    }
}

/**
 * TikTok Trending Sounds (Mock API - real API requires auth)
 */
export class TikTokSounds {
    /**
     * Get trending sound suggestions for YouTube search
     */
    getTrendingSoundQueries() {
        return [
            'tiktok viral songs 2024',
            'tiktok trending sounds',
            'viral tiktok music',
            'tiktok dance songs',
            'trending tiktok audio'
        ];
    }
}

/**
 * Music Metadata Aggregator
 * Combines data from multiple sources
 */
export class MusicMetadataAggregator {
    constructor() {
        this.deezer = new DeezerAPI();
        this.apple = new AppleMusicAPI();
    }

    /**
     * Get enriched track metadata from multiple sources
     * @param {string} title - Track title
     * @param {string} artist - Artist name
     */
    async getEnrichedMetadata(title, artist) {
        const query = `${title} ${artist}`;
        
        const [deezerResults, appleResults] = await Promise.all([
            this.deezer.search(query, 1),
            this.apple.search(query, 1)
        ]);

        const deezerTrack = deezerResults[0];
        const appleTrack = appleResults[0];

        return {
            title: title,
            artist: artist,
            deezer: deezerTrack || null,
            apple: appleTrack || null,
            genres: [appleTrack?.genre].filter(Boolean),
            highResThumbnail: appleTrack?.thumbnail || deezerTrack?.thumbnail,
            album: deezerTrack?.album || appleTrack?.album,
            releaseDate: appleTrack?.releaseDate
        };
    }

    /**
     * Search across all platforms
     * @param {string} query - Search query
     * @param {number} limit - Results per platform
     */
    async searchAll(query, limit = 5) {
        const [deezer, apple] = await Promise.all([
            this.deezer.search(query, limit),
            this.apple.search(query, limit)
        ]);

        return { deezer, apple };
    }
}

/**
 * Radio Station Integration
 * Provides internet radio station search
 */
export class RadioBrowserAPI {
    constructor() {
        this.baseUrl = 'https://de1.api.radio-browser.info/json';
    }

    /**
     * Search radio stations
     * @param {string} query - Search query
     * @param {number} limit - Number of results
     */
    async search(query, limit = 10) {
        try {
            const response = await fetch(
                `${this.baseUrl}/stations/search?name=${encodeURIComponent(query)}&limit=${limit}`
            );
            
            if (!response.ok) return [];

            const data = await response.json();
            
            return data.map(station => ({
                name: station.name,
                url: station.url_resolved || station.url,
                country: station.country,
                language: station.language,
                tags: station.tags,
                favicon: station.favicon,
                votes: station.votes,
                bitrate: station.bitrate,
                source: 'radio'
            }));
        } catch {
            return [];
        }
    }

    /**
     * Get top voted stations
     * @param {number} limit - Number of results
     */
    async getTopStations(limit = 25) {
        try {
            const response = await fetch(
                `${this.baseUrl}/stations/topvote?limit=${limit}`
            );
            
            if (!response.ok) return [];

            const data = await response.json();
            
            return data.map(station => ({
                name: station.name,
                url: station.url_resolved || station.url,
                country: station.country,
                tags: station.tags,
                favicon: station.favicon,
                votes: station.votes,
                source: 'radio'
            }));
        } catch {
            return [];
        }
    }

    /**
     * Get stations by country
     * @param {string} countryCode - Country code (e.g., 'US', 'EG')
     * @param {number} limit - Number of results
     */
    async getByCountry(countryCode, limit = 25) {
        try {
            const response = await fetch(
                `${this.baseUrl}/stations/bycountrycodeexact/${countryCode}?limit=${limit}&order=votes&reverse=true`
            );
            
            if (!response.ok) return [];

            const data = await response.json();
            
            return data.map(station => ({
                name: station.name,
                url: station.url_resolved || station.url,
                country: station.country,
                tags: station.tags,
                favicon: station.favicon,
                votes: station.votes,
                source: 'radio'
            }));
        } catch {
            return [];
        }
    }
}

export default {
    DeezerAPI,
    AppleMusicAPI,
    TikTokSounds,
    MusicMetadataAggregator,
    RadioBrowserAPI
};
