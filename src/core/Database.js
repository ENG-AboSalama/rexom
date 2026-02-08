import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class Database {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, '../../data/rexom.db');
    }

    async init() {
        const dataDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        this.db = new BetterSqlite3(this.dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');

        this.#createTables();
        this.#runMigrations();
        
        return this;
    }

    #runMigrations() {
        try {
            const tableInfo = this.db.prepare("PRAGMA table_info(guild_settings)").all();
            const columns = tableInfo.map(c => c.name);
            if (!columns.includes('247_enabled')) {
                this.db.exec('ALTER TABLE guild_settings ADD COLUMN "247_enabled" INTEGER DEFAULT 0');
            }
            if (!columns.includes('247_channel')) {
                this.db.exec('ALTER TABLE guild_settings ADD COLUMN "247_channel" TEXT');
            }
        } catch (e) {
        }
    }

    #createTables() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS guild_settings (
                guild_id TEXT PRIMARY KEY,
                prefix TEXT DEFAULT '!',
                lang TEXT DEFAULT 'en',
                dj_role TEXT,
                dj_enabled INTEGER DEFAULT 0,
                default_volume INTEGER DEFAULT 80,
                announce_songs INTEGER DEFAULT 1,
                music_channel TEXT,
                music_message TEXT,
                auto_leave INTEGER DEFAULT 1,
                auto_leave_timeout INTEGER DEFAULT 300,
                vote_skip INTEGER DEFAULT 0,
                vote_skip_percentage INTEGER DEFAULT 50,
                max_queue_size INTEGER DEFAULT 500,
                max_song_length INTEGER DEFAULT 0,
                allow_duplicates INTEGER DEFAULT 1,
                "247_enabled" INTEGER DEFAULT 0,
                "247_channel" TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS playlists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                songs TEXT NOT NULL,
                is_public INTEGER DEFAULT 0,
                plays INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, name)
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS song_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                uri TEXT NOT NULL,
                duration INTEGER,
                thumbnail TEXT,
                source TEXT,
                played_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS temp_channels (
                guild_id TEXT PRIMARY KEY,
                category_id TEXT,
                create_channel_id TEXT,
                name_format TEXT DEFAULT '{user}''s Channel',
                user_limit INTEGER DEFAULT 0
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                uri TEXT NOT NULL,
                duration INTEGER,
                thumbnail TEXT,
                source TEXT,
                added_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, uri)
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS statistics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                songs_played INTEGER DEFAULT 0,
                total_duration INTEGER DEFAULT 0,
                unique_users INTEGER DEFAULT 0,
                commands_used INTEGER DEFAULT 0,
                UNIQUE(date, guild_id)
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS command_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                command TEXT NOT NULL,
                args TEXT,
                timestamp INTEGER DEFAULT (strftime('%s', 'now') * 1000)
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS music_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                user_id TEXT NOT NULL,
                action TEXT NOT NULL,
                track_title TEXT,
                track_uri TEXT,
                timestamp INTEGER DEFAULT (strftime('%s', 'now') * 1000)
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS error_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT,
                command TEXT,
                error TEXT NOT NULL,
                stack TEXT,
                timestamp INTEGER DEFAULT (strftime('%s', 'now') * 1000)
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS user_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                songs_played INTEGER DEFAULT 0,
                time_listened INTEGER DEFAULT 0,
                commands_used INTEGER DEFAULT 0,
                playlists_created INTEGER DEFAULT 0,
                favorites_count INTEGER DEFAULT 0,
                last_active INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                UNIQUE(user_id, guild_id)
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS command_permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                command_name TEXT NOT NULL,
                enabled INTEGER DEFAULT 1,
                allowed_roles TEXT DEFAULT '[]',
                allowed_users TEXT DEFAULT '[]',
                denied_roles TEXT DEFAULT '[]',
                denied_users TEXT DEFAULT '[]',
                require_dj INTEGER DEFAULT 0,
                cooldown_override INTEGER DEFAULT 0,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(guild_id, command_name)
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS rate_limits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                action TEXT NOT NULL,
                count INTEGER DEFAULT 1,
                window_start INTEGER DEFAULT (strftime('%s', 'now') * 1000),
                UNIQUE(user_id, action)
            )
        `);

        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_history_guild ON song_history(guild_id);
            CREATE INDEX IF NOT EXISTS idx_history_user ON song_history(user_id);
            CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists(user_id);
            CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
            CREATE INDEX IF NOT EXISTS idx_stats_date ON statistics(date);
            CREATE INDEX IF NOT EXISTS idx_command_logs_guild ON command_logs(guild_id);
            CREATE INDEX IF NOT EXISTS idx_music_logs_guild ON music_logs(guild_id);
            CREATE INDEX IF NOT EXISTS idx_user_stats_guild ON user_stats(guild_id);
            CREATE INDEX IF NOT EXISTS idx_user_stats_songs ON user_stats(songs_played);
            CREATE INDEX IF NOT EXISTS idx_command_perms_guild ON command_permissions(guild_id);
        `);
    }


    getGuildSettings(guildId) {
        const stmt = this.db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?');
        let settings = stmt.get(guildId);
        
        if (!settings) {
            this.db.prepare(`
                INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)
            `).run(guildId);
            settings = stmt.get(guildId);
        }
        
        return settings;
    }

    updateGuildSettings(guildId, updates) {
        const allowed = [
            'prefix', 'lang', 'dj_role', 'dj_enabled', 'default_volume',
            'announce_songs', 'music_channel', 'music_message', 'auto_leave',
            'auto_leave_timeout', 'vote_skip', 'vote_skip_percentage',
            'max_queue_size', 'max_song_length', 'allow_duplicates',
            '247_enabled', '247_channel'
        ];
        
        const filtered = Object.entries(updates)
            .filter(([key]) => allowed.includes(key))
            .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});
        
        if (Object.keys(filtered).length === 0) return false;
        
        const entries = Object.entries(filtered);
        const sets = entries.map(([k]) => `"${k}" = ?`).join(', ');
        const values = entries.map(([, v]) => v);
        
        const stmt = this.db.prepare(`
            UPDATE guild_settings 
            SET ${sets}, updated_at = CURRENT_TIMESTAMP 
            WHERE guild_id = ?
        `);
        
        return stmt.run(...values, guildId).changes > 0;
    }


    createPlaylist(userId, name, songs = [], isPublic = false) {
        const stmt = this.db.prepare(`
            INSERT INTO playlists (user_id, name, songs, is_public)
            VALUES (?, ?, ?, ?)
        `);
        
        try {
            const result = stmt.run(userId, name, JSON.stringify(songs), isPublic ? 1 : 0);
            return result.lastInsertRowid;
        } catch (e) {
            if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return null; // Playlist already exists
            }
            throw e;
        }
    }

    getPlaylist(userId, name) {
        const stmt = this.db.prepare(`
            SELECT * FROM playlists WHERE user_id = ? AND name = ?
        `);
        const playlist = stmt.get(userId, name);
        
        if (playlist) {
            playlist.songs = JSON.parse(playlist.songs);
        }
        
        return playlist;
    }

    getUserPlaylists(userId) {
        const stmt = this.db.prepare(`
            SELECT id, name, is_public, plays, created_at, 
                   json_array_length(songs) as song_count
            FROM playlists WHERE user_id = ?
            ORDER BY updated_at DESC
        `);
        return stmt.all(userId);
    }

    updatePlaylist(userId, name, songs) {
        const stmt = this.db.prepare(`
            UPDATE playlists 
            SET songs = ?, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ? AND name = ?
        `);
        return stmt.run(JSON.stringify(songs), userId, name).changes > 0;
    }

    deletePlaylist(userId, name) {
        const stmt = this.db.prepare(`
            DELETE FROM playlists WHERE user_id = ? AND name = ?
        `);
        return stmt.run(userId, name).changes > 0;
    }

    incrementPlaylistPlays(userId, name) {
        const stmt = this.db.prepare(`
            UPDATE playlists 
            SET plays = plays + 1
            WHERE user_id = ? AND name = ?
        `);
        return stmt.run(userId, name).changes > 0;
    }


    addFavorite(userId, track) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO favorites (user_id, title, uri, duration, thumbnail, source)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(
            userId, 
            track.title, 
            track.uri, 
            track.duration || 0, 
            track.thumbnail || null,
            track.source || 'unknown'
        ).changes > 0;
    }

    removeFavorite(userId, uri) {
        const stmt = this.db.prepare(`
            DELETE FROM favorites WHERE user_id = ? AND uri = ?
        `);
        return stmt.run(userId, uri).changes > 0;
    }

    getUserFavorites(userId, limit = 50) {
        const stmt = this.db.prepare(`
            SELECT * FROM favorites WHERE user_id = ?
            ORDER BY added_at DESC LIMIT ?
        `);
        return stmt.all(userId, limit);
    }

    isFavorite(userId, uri) {
        const stmt = this.db.prepare(`
            SELECT 1 FROM favorites WHERE user_id = ? AND uri = ?
        `);
        return !!stmt.get(userId, uri);
    }

    clearAllFavorites(userId) {
        const stmt = this.db.prepare('DELETE FROM favorites WHERE user_id = ?');
        return stmt.run(userId).changes;
    }


    addToHistory(guildId, userId, track) {
        const stmt = this.db.prepare(`
            INSERT INTO song_history (guild_id, user_id, title, uri, duration, thumbnail, source)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(
            guildId, userId, track.title, track.uri,
            track.duration || 0, track.thumbnail || null, track.source || 'unknown'
        ).lastInsertRowid;
    }

    getGuildHistory(guildId, limit = 20) {
        const stmt = this.db.prepare(`
            SELECT * FROM song_history WHERE guild_id = ?
            ORDER BY played_at DESC LIMIT ?
        `);
        return stmt.all(guildId, limit);
    }

    getUserHistory(userId, limit = 20) {
        const stmt = this.db.prepare(`
            SELECT * FROM song_history WHERE user_id = ?
            ORDER BY played_at DESC LIMIT ?
        `);
        return stmt.all(userId, limit);
    }

    getUserRecentSearches(userId, limit = 5) {
        const stmt = this.db.prepare(`
            SELECT DISTINCT title as query FROM song_history 
            WHERE user_id = ?
            ORDER BY played_at DESC LIMIT ?
        `);
        return stmt.all(userId, limit);
    }


    getTempChannelConfig(guildId) {
        const stmt = this.db.prepare(`
            SELECT * FROM temp_channels WHERE guild_id = ?
        `);
        return stmt.get(guildId);
    }

    setTempChannelConfig(guildId, config) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO temp_channels (guild_id, category_id, create_channel_id, name_format, user_limit)
            VALUES (?, ?, ?, ?, ?)
        `);
        return stmt.run(
            guildId,
            config.categoryId,
            config.createChannelId,
            config.nameFormat || "{user}'s Channel",
            config.userLimit || 0
        ).changes > 0;
    }

    deleteTempChannelConfig(guildId) {
        const stmt = this.db.prepare(`
            DELETE FROM temp_channels WHERE guild_id = ?
        `);
        return stmt.run(guildId).changes > 0;
    }


    incrementStats(guildId, field, amount = 1) {
        const date = new Date().toISOString().split('T')[0];
        
        this.db.prepare(`
            INSERT OR IGNORE INTO statistics (date, guild_id)
            VALUES (?, ?)
        `).run(date, guildId);
        
        const allowed = ['songs_played', 'total_duration', 'unique_users', 'commands_used'];
        if (!allowed.includes(field)) return false;
        
        const stmt = this.db.prepare(`
            UPDATE statistics SET ${field} = ${field} + ?
            WHERE date = ? AND guild_id = ?
        `);
        return stmt.run(amount, date, guildId).changes > 0;
    }

    getGuildStats(guildId, days = 7) {
        const stmt = this.db.prepare(`
            SELECT * FROM statistics 
            WHERE guild_id = ? AND date >= date('now', '-' || ? || ' days')
            ORDER BY date DESC
        `);
        return stmt.all(guildId, days);
    }


    logCommand(guildId, userId, command, args = null) {
        const stmt = this.db.prepare(`
            INSERT INTO command_logs (guild_id, user_id, command, args)
            VALUES (?, ?, ?, ?)
        `);
        return stmt.run(guildId, userId, command, args).lastInsertRowid;
    }

    getCommandLogs(guildId, limit = 50) {
        const stmt = this.db.prepare(`
            SELECT * FROM command_logs WHERE guild_id = ?
            ORDER BY timestamp DESC LIMIT ?
        `);
        return stmt.all(guildId, limit);
    }


    logMusicAction(guildId, userId, action, trackTitle = null, trackUri = null) {
        const stmt = this.db.prepare(`
            INSERT INTO music_logs (guild_id, user_id, action, track_title, track_uri)
            VALUES (?, ?, ?, ?, ?)
        `);
        return stmt.run(guildId, userId, action, trackTitle, trackUri).lastInsertRowid;
    }

    getMusicLogs(guildId, limit = 50) {
        const stmt = this.db.prepare(`
            SELECT * FROM music_logs WHERE guild_id = ?
            ORDER BY timestamp DESC LIMIT ?
        `);
        return stmt.all(guildId, limit);
    }


    logError(guildId, command, error, stack = null) {
        const stmt = this.db.prepare(`
            INSERT INTO error_logs (guild_id, command, error, stack)
            VALUES (?, ?, ?, ?)
        `);
        return stmt.run(guildId, command, error, stack).lastInsertRowid;
    }

    getErrorLogs(guildId, limit = 20) {
        const stmt = this.db.prepare(`
            SELECT * FROM error_logs WHERE guild_id = ? OR guild_id IS NULL
            ORDER BY timestamp DESC LIMIT ?
        `);
        return stmt.all(guildId, limit);
    }

    clearLogs(guildId, type) {
        switch (type) {
            case 'commands':
                this.db.prepare('DELETE FROM command_logs WHERE guild_id = ?').run(guildId);
                break;
            case 'music':
                this.db.prepare('DELETE FROM music_logs WHERE guild_id = ?').run(guildId);
                break;
            case 'errors':
                this.db.prepare('DELETE FROM error_logs WHERE guild_id = ? OR guild_id IS NULL').run(guildId);
                break;
            case 'all':
                this.db.prepare('DELETE FROM command_logs WHERE guild_id = ?').run(guildId);
                this.db.prepare('DELETE FROM music_logs WHERE guild_id = ?').run(guildId);
                this.db.prepare('DELETE FROM error_logs WHERE guild_id = ? OR guild_id IS NULL').run(guildId);
                break;
        }
        return true;
    }


    updateUserStats(userId, guildId, field, amount = 1) {
        this.db.prepare(`
            INSERT OR IGNORE INTO user_stats (user_id, guild_id)
            VALUES (?, ?)
        `).run(userId, guildId);

        const allowed = ['songs_played', 'time_listened', 'commands_used', 'playlists_created', 'favorites_count'];
        if (!allowed.includes(field)) return false;

        const stmt = this.db.prepare(`
            UPDATE user_stats 
            SET ${field} = ${field} + ?, last_active = strftime('%s', 'now') * 1000
            WHERE user_id = ? AND guild_id = ?
        `);
        return stmt.run(amount, userId, guildId).changes > 0;
    }

    getUserStats(userId, guildId) {
        const stmt = this.db.prepare(`
            SELECT * FROM user_stats WHERE user_id = ? AND guild_id = ?
        `);
        return stmt.get(userId, guildId);
    }

    getLeaderboard(type, guildId = null, limit = 10) {
        const fieldMap = {
            'songs': 'songs_played',
            'songs_played': 'songs_played',
            'time': 'time_listened',
            'time_listened': 'time_listened',
            'playlists': 'playlists_created',
            'favorites': 'favorites_count',
            'commands': 'commands_used'
        };

        const field = fieldMap[type] || 'songs_played';

        let query;
        if (guildId) {
            query = this.db.prepare(`
                SELECT user_id as userId, ${field} as value
                FROM user_stats
                WHERE guild_id = ? AND ${field} > 0
                ORDER BY ${field} DESC
                LIMIT ?
            `);
            return query.all(guildId, limit);
        } else {
            query = this.db.prepare(`
                SELECT user_id as userId, SUM(${field}) as value
                FROM user_stats
                WHERE ${field} > 0
                GROUP BY user_id
                ORDER BY value DESC
                LIMIT ?
            `);
            return query.all(limit);
        }
    }

    getStatistics(guildId) {
        const stmt = this.db.prepare(`
            SELECT user_id, songs_played as songs, time_listened as time, 
                   playlists_created as playlists, favorites_count as favorites
            FROM user_stats WHERE guild_id = ?
        `);
        const rows = stmt.all(guildId);
        
        const result = {};
        for (const row of rows) {
            result[row.user_id] = {
                songs: row.songs,
                time: row.time,
                playlists: row.playlists,
                favorites: row.favorites
            };
        }
        return result;
    }


    getServerHistory(guildId, limit = 20) {
        const stmt = this.db.prepare(`
            SELECT title, uri, duration, thumbnail, user_id, 
                   CAST(strftime('%s', played_at) AS INTEGER) * 1000 as playedAt
            FROM song_history WHERE guild_id = ?
            ORDER BY played_at DESC LIMIT ?
        `);
        return stmt.all(guildId, limit);
    }


    getCommandPermission(guildId, commandName) {
        const stmt = this.db.prepare(`
            SELECT * FROM command_permissions 
            WHERE guild_id = ? AND command_name = ?
        `);
        const permission = stmt.get(guildId, commandName);
        
        if (permission) {
            permission.allowed_roles = JSON.parse(permission.allowed_roles || '[]');
            permission.allowed_users = JSON.parse(permission.allowed_users || '[]');
            permission.denied_roles = JSON.parse(permission.denied_roles || '[]');
            permission.denied_users = JSON.parse(permission.denied_users || '[]');
        }
        
        return permission;
    }

    getAllCommandPermissions(guildId) {
        const stmt = this.db.prepare(`
            SELECT * FROM command_permissions WHERE guild_id = ?
        `);
        const permissions = stmt.all(guildId);
        
        return permissions.map(p => ({
            ...p,
            allowed_roles: JSON.parse(p.allowed_roles || '[]'),
            allowed_users: JSON.parse(p.allowed_users || '[]'),
            denied_roles: JSON.parse(p.denied_roles || '[]'),
            denied_users: JSON.parse(p.denied_users || '[]')
        }));
    }

    setCommandPermission(guildId, commandName, settings) {
        const stmt = this.db.prepare(`
            INSERT INTO command_permissions (
                guild_id, command_name, enabled, allowed_roles, allowed_users, 
                denied_roles, denied_users, require_dj, cooldown_override
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(guild_id, command_name) DO UPDATE SET
                enabled = excluded.enabled,
                allowed_roles = excluded.allowed_roles,
                allowed_users = excluded.allowed_users,
                denied_roles = excluded.denied_roles,
                denied_users = excluded.denied_users,
                require_dj = excluded.require_dj,
                cooldown_override = excluded.cooldown_override,
                updated_at = CURRENT_TIMESTAMP
        `);

        return stmt.run(
            guildId,
            commandName,
            settings.enabled !== undefined ? (settings.enabled ? 1 : 0) : 1,
            JSON.stringify(settings.allowed_roles || []),
            JSON.stringify(settings.allowed_users || []),
            JSON.stringify(settings.denied_roles || []),
            JSON.stringify(settings.denied_users || []),
            settings.require_dj ? 1 : 0,
            settings.cooldown_override || 0
        ).changes > 0;
    }

    updateCommandEnabled(guildId, commandName, enabled) {
        const stmt = this.db.prepare(`
            INSERT INTO command_permissions (guild_id, command_name, enabled)
            VALUES (?, ?, ?)
            ON CONFLICT(guild_id, command_name) DO UPDATE SET
                enabled = excluded.enabled,
                updated_at = CURRENT_TIMESTAMP
        `);
        return stmt.run(guildId, commandName, enabled ? 1 : 0).changes >= 0;
    }

    deleteCommandPermission(guildId, commandName) {
        const stmt = this.db.prepare(`
            DELETE FROM command_permissions 
            WHERE guild_id = ? AND command_name = ?
        `);
        return stmt.run(guildId, commandName).changes > 0;
    }

    resetAllCommandPermissions(guildId) {
        const stmt = this.db.prepare(`
            DELETE FROM command_permissions WHERE guild_id = ?
        `);
        return stmt.run(guildId).changes;
    }

    canUseCommand(guildId, commandName, userId, userRoles) {
        const permission = this.getCommandPermission(guildId, commandName);
        
        if (!permission) return { allowed: true };
        
        if (!permission.enabled) {
            return { allowed: false, reason: 'command_disabled' };
        }
        
        if (permission.denied_users.includes(userId)) {
            return { allowed: false, reason: 'user_denied' };
        }
        
        const hasDeniedRole = userRoles.some(r => permission.denied_roles.includes(r));
        if (hasDeniedRole) {
            return { allowed: false, reason: 'role_denied' };
        }
        
        if (permission.allowed_users.length === 0 && permission.allowed_roles.length === 0) {
            return { allowed: true };
        }
        
        if (permission.allowed_users.includes(userId)) {
            return { allowed: true };
        }
        
        const hasAllowedRole = userRoles.some(r => permission.allowed_roles.includes(r));
        if (hasAllowedRole) {
            return { allowed: true };
        }
        
        return { allowed: false, reason: 'not_allowed' };
    }


    checkRateLimit(userId, action, maxCount, windowMs) {
        const now = Date.now();
        
        const stmt = this.db.prepare(`
            SELECT count, window_start FROM rate_limits
            WHERE user_id = ? AND action = ?
        `);
        const record = stmt.get(userId, action);
        
        if (!record) {
            this.db.prepare(`
                INSERT INTO rate_limits (user_id, action, count, window_start)
                VALUES (?, ?, 1, ?)
            `).run(userId, action, now);
            return { limited: false, remaining: maxCount - 1 };
        }
        
        if (now - record.window_start > windowMs) {
            this.db.prepare(`
                UPDATE rate_limits SET count = 1, window_start = ?
                WHERE user_id = ? AND action = ?
            `).run(now, userId, action);
            return { limited: false, remaining: maxCount - 1 };
        }
        
        if (record.count >= maxCount) {
            const resetAt = record.window_start + windowMs;
            return { 
                limited: true, 
                remaining: 0,
                resetAt,
                retryAfter: resetAt - now
            };
        }
        
        this.db.prepare(`
            UPDATE rate_limits SET count = count + 1
            WHERE user_id = ? AND action = ?
        `).run(userId, action);
        
        return { limited: false, remaining: maxCount - record.count - 1 };
    }

    cleanupRateLimits(olderThanMs = 3600000) {
        const cutoff = Date.now() - olderThanMs;
        const stmt = this.db.prepare(`
            DELETE FROM rate_limits WHERE window_start < ?
        `);
        return stmt.run(cutoff).changes;
    }


    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

export default Database;
