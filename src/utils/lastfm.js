const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';

export class LastFM {
    constructor(apiKey, apiSecret) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
    }

    /**
     * Search for a track
     */
    async searchTrack(query, limit = 10) {
        try {
            const params = new URLSearchParams({
                method: 'track.search',
                track: query,
                api_key: this.apiKey,
                format: 'json',
                limit: limit.toString()
            });

            const response = await fetch(`${LASTFM_API_URL}?${params}`);
            const data = await response.json();

            if (!data.results?.trackmatches?.track) {
                return [];
            }

            return data.results.trackmatches.track.map(track => ({
                name: track.name,
                artist: track.artist,
                url: track.url,
                listeners: parseInt(track.listeners) || 0,
                image: track.image?.find(i => i.size === 'large')?.['#text'] || null
            }));
        } catch (error) {
            console.error('Last.fm search error:', error);
            return [];
        }
    }

    /**
     * Get track info with tags, duration, etc.
     */
    async getTrackInfo(artist, track) {
        try {
            const params = new URLSearchParams({
                method: 'track.getInfo',
                artist: artist,
                track: track,
                api_key: this.apiKey,
                format: 'json'
            });

            const response = await fetch(`${LASTFM_API_URL}?${params}`);
            const data = await response.json();

            if (!data.track) {
                return null;
            }

            const t = data.track;
            return {
                name: t.name,
                artist: t.artist?.name,
                album: t.album?.title,
                url: t.url,
                duration: parseInt(t.duration) || 0,
                listeners: parseInt(t.listeners) || 0,
                playcount: parseInt(t.playcount) || 0,
                tags: t.toptags?.tag?.map(tag => tag.name) || [],
                wiki: t.wiki?.summary?.replace(/<[^>]*>/g, '') || null,
                image: t.album?.image?.find(i => i.size === 'extralarge')?.['#text'] || null
            };
        } catch (error) {
            console.error('Last.fm track info error:', error);
            return null;
        }
    }

    /**
     * Get similar tracks
     */
    async getSimilarTracks(artist, track, limit = 10) {
        try {
            const params = new URLSearchParams({
                method: 'track.getSimilar',
                artist: artist,
                track: track,
                api_key: this.apiKey,
                format: 'json',
                limit: limit.toString()
            });

            const response = await fetch(`${LASTFM_API_URL}?${params}`);
            const data = await response.json();

            if (!data.similartracks?.track) {
                return [];
            }

            return data.similartracks.track.map(t => ({
                name: t.name,
                artist: t.artist?.name,
                url: t.url,
                match: parseFloat(t.match) || 0,
                image: t.image?.find(i => i.size === 'large')?.['#text'] || null
            }));
        } catch (error) {
            console.error('Last.fm similar tracks error:', error);
            return [];
        }
    }

    /**
     * Get artist info
     */
    async getArtistInfo(artist) {
        try {
            const params = new URLSearchParams({
                method: 'artist.getInfo',
                artist: artist,
                api_key: this.apiKey,
                format: 'json'
            });

            const response = await fetch(`${LASTFM_API_URL}?${params}`);
            const data = await response.json();

            if (!data.artist) {
                return null;
            }

            const a = data.artist;
            return {
                name: a.name,
                url: a.url,
                listeners: parseInt(a.stats?.listeners) || 0,
                playcount: parseInt(a.stats?.playcount) || 0,
                tags: a.tags?.tag?.map(tag => tag.name) || [],
                similar: a.similar?.artist?.map(s => s.name) || [],
                bio: a.bio?.summary?.replace(/<[^>]*>/g, '') || null,
                image: a.image?.find(i => i.size === 'extralarge')?.['#text'] || null
            };
        } catch (error) {
            console.error('Last.fm artist info error:', error);
            return null;
        }
    }

    /**
     * Get top tracks for an artist
     */
    async getArtistTopTracks(artist, limit = 10) {
        try {
            const params = new URLSearchParams({
                method: 'artist.getTopTracks',
                artist: artist,
                api_key: this.apiKey,
                format: 'json',
                limit: limit.toString()
            });

            const response = await fetch(`${LASTFM_API_URL}?${params}`);
            const data = await response.json();

            if (!data.toptracks?.track) {
                return [];
            }

            return data.toptracks.track.map(t => ({
                name: t.name,
                url: t.url,
                listeners: parseInt(t.listeners) || 0,
                playcount: parseInt(t.playcount) || 0
            }));
        } catch (error) {
            console.error('Last.fm top tracks error:', error);
            return [];
        }
    }

    /**
     * Get chart top tracks
     */
    async getChartTopTracks(limit = 50) {
        try {
            const params = new URLSearchParams({
                method: 'chart.getTopTracks',
                api_key: this.apiKey,
                format: 'json',
                limit: limit.toString()
            });

            const response = await fetch(`${LASTFM_API_URL}?${params}`);
            const data = await response.json();

            if (!data.tracks?.track) {
                return [];
            }

            return data.tracks.track.map(t => ({
                name: t.name,
                artist: t.artist?.name,
                url: t.url,
                listeners: parseInt(t.listeners) || 0,
                playcount: parseInt(t.playcount) || 0,
                image: t.image?.find(i => i.size === 'large')?.['#text'] || null
            }));
        } catch (error) {
            console.error('Last.fm chart error:', error);
            return [];
        }
    }

    /**
     * Search by tag/genre
     */
    async getTagTopTracks(tag, limit = 20) {
        try {
            const params = new URLSearchParams({
                method: 'tag.getTopTracks',
                tag: tag,
                api_key: this.apiKey,
                format: 'json',
                limit: limit.toString()
            });

            const response = await fetch(`${LASTFM_API_URL}?${params}`);
            const data = await response.json();

            if (!data.tracks?.track) {
                return [];
            }

            return data.tracks.track.map(t => ({
                name: t.name,
                artist: t.artist?.name,
                url: t.url,
                duration: parseInt(t.duration) || 0
            }));
        } catch (error) {
            console.error('Last.fm tag tracks error:', error);
            return [];
        }
    }
}

export default LastFM;
