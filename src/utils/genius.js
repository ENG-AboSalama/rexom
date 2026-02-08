const GENIUS_API_URL = 'https://api.genius.com';
const GENIUS_SEARCH_URL = 'https://genius.com/api/search/multi';

export class Genius {
    constructor(accessToken) {
        this.accessToken = accessToken;
    }

    /**
     * Search for a song on Genius
     */
    async search(query, limit = 10) {
        try {
            const response = await fetch(
                `${GENIUS_SEARCH_URL}?q=${encodeURIComponent(query)}`,
                {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                }
            );

            const data = await response.json();
            
            if (!data.response?.sections) {
                return [];
            }

            const songSection = data.response.sections.find(s => s.type === 'song');
            if (!songSection?.hits) {
                return [];
            }

            return songSection.hits.slice(0, limit).map(hit => ({
                id: hit.result.id,
                title: hit.result.title,
                artist: hit.result.primary_artist?.name,
                url: hit.result.url,
                thumbnail: hit.result.song_art_image_thumbnail_url,
                fullTitle: hit.result.full_title,
                releaseDate: hit.result.release_date_for_display
            }));
        } catch (error) {
            console.error('Genius search error:', error);
            return [];
        }
    }

    /**
     * Get song details by ID
     */
    async getSong(songId) {
        try {
            if (!this.accessToken) {
                return null;
            }

            const response = await fetch(
                `${GENIUS_API_URL}/songs/${songId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            const data = await response.json();
            
            if (!data.response?.song) {
                return null;
            }

            const song = data.response.song;
            return {
                id: song.id,
                title: song.title,
                artist: song.primary_artist?.name,
                album: song.album?.name,
                releaseDate: song.release_date_for_display,
                url: song.url,
                lyricsUrl: song.url,
                thumbnail: song.song_art_image_url,
                headerImage: song.header_image_url,
                description: song.description?.plain,
                producers: song.producer_artists?.map(a => a.name) || [],
                writers: song.writer_artists?.map(a => a.name) || [],
                featuredArtists: song.featured_artists?.map(a => a.name) || [],
                pageViews: song.stats?.pageviews || 0
            };
        } catch (error) {
            console.error('Genius get song error:', error);
            return null;
        }
    }

    /**
     * Get lyrics from Genius page (scraping)
     */
    async getLyrics(url) {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const html = await response.text();
            
            const lyricsMatches = html.match(/data-lyrics-container="true"[^>]*>(.+?)<\/div>/gs);
            
            if (!lyricsMatches) {
                const altMatch = html.match(/<div class="lyrics">(.+?)<\/div>/s);
                if (altMatch) {
                    return this.cleanLyrics(altMatch[1]);
                }
                return null;
            }

            let lyrics = lyricsMatches
                .map(match => match.replace(/<[^>]*>/g, '\n'))
                .join('\n');

            return this.cleanLyrics(lyrics);
        } catch (error) {
            console.error('Genius lyrics scrape error:', error);
            return null;
        }
    }

    /**
     * Search and get lyrics in one call
     */
    async searchLyrics(query) {
        try {
            const results = await this.search(query, 1);
            
            if (results.length === 0) {
                return null;
            }

            const song = results[0];
            const lyrics = await this.getLyrics(song.url);

            return {
                ...song,
                lyrics
            };
        } catch (error) {
            console.error('Genius search lyrics error:', error);
            return null;
        }
    }

    /**
     * Clean up scraped lyrics
     */
    cleanLyrics(lyrics) {
        if (!lyrics) return null;

        return lyrics
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&#39;/g, "'")
            .replace(/\[.*?\]/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    /**
     * Get artist info
     */
    async getArtist(artistId) {
        try {
            if (!this.accessToken) {
                return null;
            }

            const response = await fetch(
                `${GENIUS_API_URL}/artists/${artistId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );

            const data = await response.json();
            
            if (!data.response?.artist) {
                return null;
            }

            const artist = data.response.artist;
            return {
                id: artist.id,
                name: artist.name,
                url: artist.url,
                image: artist.image_url,
                description: artist.description?.plain,
                twitter: artist.twitter_name,
                instagram: artist.instagram_name,
                facebook: artist.facebook_name
            };
        } catch (error) {
            console.error('Genius get artist error:', error);
            return null;
        }
    }
}

/**
 * Alternative lyrics sources as fallback
 */
export class LyricsManager {
    constructor(geniusToken, lrclibEnabled = true) {
        this.genius = geniusToken ? new Genius(geniusToken) : null;
        this.lrclibEnabled = lrclibEnabled;
    }

    /**
     * Get lyrics from multiple sources
     */
    async getLyrics(title, artist) {
        const query = `${artist} ${title}`.replace(/\(.*?\)|\[.*?\]/g, '').trim();
        
        if (this.lrclibEnabled) {
            const lrclibLyrics = await this.getLyricsFromLRCLIB(title, artist);
            if (lrclibLyrics) {
                return {
                    source: 'LRCLIB',
                    ...lrclibLyrics
                };
            }
        }

        if (this.genius) {
            const geniusResult = await this.genius.searchLyrics(query);
            if (geniusResult?.lyrics) {
                return {
                    source: 'Genius',
                    title: geniusResult.title,
                    artist: geniusResult.artist,
                    lyrics: geniusResult.lyrics,
                    url: geniusResult.url,
                    thumbnail: geniusResult.thumbnail
                };
            }
        }

        return null;
    }

    /**
     * Get lyrics from LRCLIB (free service)
     */
    async getLyricsFromLRCLIB(title, artist) {
        try {
            const cleanTitle = title.replace(/\(.*?\)|\[.*?\]/g, '').trim();
            const cleanArtist = artist.replace(/\(.*?\)|\[.*?\]/g, '').trim();
            
            const response = await fetch(
                `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`
            );

            if (!response.ok) {
                const searchResponse = await fetch(
                    `https://lrclib.net/api/search?q=${encodeURIComponent(`${cleanArtist} ${cleanTitle}`)}`
                );
                
                if (!searchResponse.ok) return null;
                
                const searchData = await searchResponse.json();
                if (!searchData || searchData.length === 0) return null;
                
                return {
                    title: searchData[0].trackName,
                    artist: searchData[0].artistName,
                    album: searchData[0].albumName,
                    lyrics: searchData[0].plainLyrics,
                    syncedLyrics: searchData[0].syncedLyrics,
                    duration: searchData[0].duration
                };
            }

            const data = await response.json();
            
            if (!data || !data.plainLyrics) {
                return null;
            }

            return {
                title: data.trackName,
                artist: data.artistName,
                album: data.albumName,
                lyrics: data.plainLyrics,
                syncedLyrics: data.syncedLyrics,
                duration: data.duration
            };
        } catch (error) {
            console.error('LRCLIB error:', error);
            return null;
        }
    }
}

export default Genius;
