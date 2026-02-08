import express from 'express';
import session from 'express-session';
import createMemoryStore from 'memorystore';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';
import { configDotenv,config } from 'dotenv';
config()
configDotenv();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MemoryStore = createMemoryStore(session);

const rateLimitStore = new Map();

function createRateLimiter(windowMs = 60000, maxRequests = 100) {
    return (req, res, next) => {
        const key = req.user?.id || req.ip;
        const now = Date.now();
        
        if (!rateLimitStore.has(key)) {
            rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }
        
        const limit = rateLimitStore.get(key);
        
        if (now > limit.resetAt) {
            limit.count = 1;
            limit.resetAt = now + windowMs;
            return next();
        }
        
        if (limit.count >= maxRequests) {
            return res.status(429).json({ 
                error: 'Too many requests',
                retryAfter: Math.ceil((limit.resetAt - now) / 1000)
            });
        }
        
        limit.count++;
        next();
    };
}

setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
        if (now > value.resetAt) {
            rateLimitStore.delete(key);
        }
    }
}, 300000);

export function createDashboard(client) {
    const app = express();

    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
    });

    const viewsDir = path.join(__dirname, 'views');
    app.set('views', viewsDir);
    app.set('view engine', 'ejs');
    app.engine('ejs', (filePath, options, callback) => {
        ejs.renderFile(filePath, options, { filename: filePath }, callback);
    });
    
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    app.use('/api', createRateLimiter(60000, 60)); // 60 requests per minute

    app.use(session({
        store: new MemoryStore({
            checkPeriod: 86400000 // prune expired entries every 24h
        }),
        secret: process.env.SESSION_SECRET || 'rexom-super-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production' && !process.env.CALLBACK_URL?.includes('localhost'),
            sameSite: 'lax'
        }
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((user, done) => done(null, user));

    if (process.env.DISCORD_CLIENT_SECRET) {
        passport.use(new DiscordStrategy({
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            callbackURL: process.env.CALLBACK_URL || 'http://localhost:3000/auth/callback',
            scope: ['identify', 'guilds']
        }, (accessToken, refreshToken, profile, done) => {
            return done(null, profile);
        }));
    }

    app.use((req, res, next) => {
        req.client = client;
        res.locals.user = req.user;
        res.locals.client = client;
        next();
    });

    const isAuthenticated = (req, res, next) => {
        if (req.isAuthenticated()) return next();
        res.redirect('/login');
    };

    const isAdmin = (guildId) => (req, res, next) => {
        if (!req.isAuthenticated()) return res.redirect('/login');
        
        const guild = req.user.guilds?.find(g => g.id === guildId);
        if (!guild || !(guild.permissions & 0x20)) {
            return res.status(403).render('error', { 
                message: 'You do not have permission to manage this server.' 
            });
        }
        next();
    };

    
    app.get('/', (req, res) => {
        const stats = {
            guilds: client.guilds.cache.size,
            users: client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0),
            players: client.kazagumo?.players?.size || 0,
            commands: client.commands.size
        };
        res.render('index', { stats });
    });

    app.get('/login', (req, res, next) => {
        if (!process.env.DISCORD_CLIENT_SECRET) {
            return res.status(503).render('error', { 
                message: 'Login is not configured. Set DISCORD_CLIENT_SECRET in your .env file.',
                statusCode: 503
            });
        }
        passport.authenticate('discord')(req, res, next);
    });
    
    app.get('/auth/callback', 
        passport.authenticate('discord', { failureRedirect: '/' }),
        (req, res) => res.redirect('/dashboard')
    );

    app.get('/logout', (req, res) => {
        req.logout(() => {
            res.redirect('/');
        });
    });

    app.get('/dashboard', isAuthenticated, (req, res) => {
        const guilds = (req.user.guilds || []).filter(g => {
            return (parseInt(g.permissions) & 0x20);
        }).map(g => {
            const botGuild = client.guilds.cache.get(g.id);
            return {
                id: g.id,
                name: g.name,
                icon: g.icon,
                memberCount: botGuild?.memberCount,
                botPresent: !!botGuild
            };
        });

        res.render('dashboard', { guilds, clientId: client.user.id });
    });

    app.get('/server/:id', isAuthenticated, (req, res) => {
        const guildId = req.params.id;
        const guild = client.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.redirect(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands&guild_id=${guildId}`);
        }

        const userGuild = req.user.guilds?.find(g => g.id === guildId);
        if (!userGuild || !(userGuild.permissions & 0x20)) {
            return res.status(403).render('error', { message: 'No permission' });
        }

        const settings = client.db.getGuildSettings(guildId);
        const player = client.kazagumo?.players?.get(guildId);

        res.render('server', { 
            guild, 
            settings,
            player,
            roles: guild.roles.cache.filter(r => r.id !== guild.id).sort((a, b) => b.position - a.position),
            channels: guild.channels.cache.filter(c => c.type === 0).sort((a, b) => a.position - b.position)
        });
    });

    app.post('/api/server/:id/settings', isAuthenticated, (req, res) => {
        const guildId = req.params.id;
        const userGuild = req.user.guilds?.find(g => g.id === guildId);
        
        if (!userGuild || !(userGuild.permissions & 0x20)) {
            return res.status(403).json({ error: 'No permission' });
        }

        const allowedFields = [
            'language', 'default_volume', 'max_volume', 'dj_role_id',
            'announce_songs', 'vote_skip', 'vote_skip_ratio', 'auto_leave',
            'auto_leave_timeout', 'mode_247'
        ];

        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        client.db.updateGuildSettings(guildId, updates);
        res.json({ success: true });
    });

    app.post('/api/server/:id/player/:action', isAuthenticated, async (req, res) => {
        const guildId = req.params.id;
        const action = req.params.action;
        const player = client.kazagumo?.players?.get(guildId);

        if (!player) {
            return res.status(404).json({ error: 'No active player' });
        }

        const { value } = req.body || {};

        switch (action) {
            case 'pause':
                player.pause(true);
                break;
            case 'resume':
                player.pause(false);
                break;
            case 'skip':
                player.skip();
                break;
            case 'stop':
                player.destroy();
                break;
            case 'shuffle':
                player.queue.shuffle();
                break;
            case 'volume': {
                const vol = req.body.value ?? req.body.volume;
                if (vol !== undefined && vol >= 0 && vol <= 150) {
                    player.setVolume(parseInt(vol));
                }
                break;
            }
            case 'seek': {
                const pos = req.body.value ?? req.body.position;
                if (pos !== undefined && pos >= 0) {
                    player.seek(parseInt(pos));
                }
                break;
            }
            case 'loop':
                const modes = ['none', 'track', 'queue'];
                const currentIndex = modes.indexOf(player.loop || 'none');
                player.setLoop(modes[(currentIndex + 1) % 3]);
                break;
            case 'previous': {
                const history = player.data.get('history') || [];
                if (history.length > 0) {
                    const prevTrack = history.pop();
                    player.data.set('history', history);
                    if (player.queue.current) {
                        player.queue.unshift(player.queue.current);
                    }
                    try {
                        const result = await client.kazagumo.search(prevTrack.uri || prevTrack.title, { requester: prevTrack.requester });
                        if (result.tracks.length > 0) {
                            player.queue.unshift(result.tracks[0]);
                            player.skip();
                        }
                    } catch (e) { /* ignore */ }
                }
                break;
            }
            case 'clear':
                player.queue.clear();
                break;
            case 'remove': {
                const idx = req.body.value ?? req.body.index;
                if (idx !== undefined && idx >= 0 && idx < player.queue.size) {
                    player.queue.splice(idx, 1);
                }
                break;
            }
            case 'move':
                const { from, to } = req.body || {};
                if (from !== undefined && to !== undefined && from >= 0 && to >= 0) {
                    const track = player.queue.splice(from, 1)[0];
                    if (track) player.queue.splice(to, 0, track);
                }
                break;
        }

        res.json({ success: true, loop: player.loop, volume: player.volume });
    });
    
    app.get('/server/:id/player', isAuthenticated, async (req, res) => {
        try {
            const guildId = req.params.id;
            const guild = client.guilds.cache.get(guildId);
            
            if (!guild) {
                return res.redirect('/dashboard?error=Guild not found');
            }
            
            const rawPlayer = client.kazagumo?.players?.get(guildId);
            
            let player = null;
            if (rawPlayer) {
                const current = rawPlayer.queue?.current;
                const queueTracks = rawPlayer.queue ? [...rawPlayer.queue] : [];
                const allTracks = [];
                
                if (current) {
                    allTracks.push({
                        title: current.title || 'Unknown',
                        author: current.author || 'Unknown',
                        duration: current.length || 0,
                        uri: current.uri || '',
                        thumbnail: current.thumbnail || null
                    });
                }
                
                for (const t of queueTracks) {
                    allTracks.push({
                        title: t.title || 'Unknown',
                        author: t.author || 'Unknown',
                        duration: t.length || 0,
                        uri: t.uri || '',
                        thumbnail: t.thumbnail || null
                    });
                }
                
                player = {
                    paused: rawPlayer.paused || false,
                    position: rawPlayer.position || 0,
                    volume: rawPlayer.volume || 50,
                    loop: rawPlayer.loop || 'none',
                    queue: allTracks
                };
            }
            
            res.render('player', {
                user: req.user,
                guild: { id: guild.id, name: guild.name, icon: guild.iconURL() },
                player,
                client: null
            });
        } catch (error) {
            client.logger.error('Player page error:', error);
            res.redirect('/dashboard');
        }
    });

    app.get('/api/server/:id/player', isAuthenticated, (req, res) => {
        const guildId = req.params.id;
        const player = client.kazagumo?.players?.get(guildId);

        if (!player) {
            return res.json({ playing: false });
        }

        const current = player.queue.current;
        res.json({
            playing: true,
            paused: player.paused,
            track: current ? {
                title: current.title,
                author: current.author,
                duration: current.length,
                position: player.position,
                thumbnail: current.thumbnail,
                uri: current.uri
            } : null,
            queue: player.queue.map(t => ({
                title: t.title,
                author: t.author,
                duration: t.length
            })),
            volume: player.volume,
            loop: player.loop
        });
    });

    app.get('/commands', (req, res) => {
        const categories = {};
        
        client.commands.forEach(cmd => {
            const cat = cmd.category || 'other';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push({
                name: cmd.data.name,
                description: cmd.data.description,
                options: cmd.data.options?.map(o => ({
                    name: o.name,
                    description: o.description,
                    required: o.required
                }))
            });
        });

        res.render('commands', { categories });
    });

    app.get('/status', (req, res) => {
        const node = client.kazagumo?.shoukaku?.nodes?.values()?.next()?.value;
        
        res.render('status', {
            bot: {
                uptime: client.uptime,
                ping: client.ws.ping,
                guilds: client.guilds.cache.size,
                players: client.kazagumo?.players?.size || 0
            },
            lavalink: node?.state === 1 ? {
                connected: true,
                stats: node.stats
            } : { connected: false }
        });
    });

    app.get('/server/:id/analytics', isAuthenticated, (req, res) => {
        const guildId = req.params.id;
        const guild = client.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.redirect('/dashboard');
        }

        const userGuild = req.user.guilds?.find(g => g.id === guildId);
        if (!userGuild || !(userGuild.permissions & 0x20)) {
            return res.status(403).render('error', { message: 'No permission' });
        }

        const stats = client.db.getGuildStats(guildId, 30);
        const leaderboard = client.db.getLeaderboard('songs', guildId, 10);
        const history = client.db.getServerHistory(guildId, 50);

        res.render('analytics', { 
            guild, 
            stats,
            leaderboard,
            history
        });
    });

    app.get('/playlists', isAuthenticated, (req, res) => {
        const playlists = client.db.getUserPlaylists(req.user.id);
        res.render('playlists', { playlists });
    });


    app.get('/api/server/:id/queue', isAuthenticated, (req, res) => {
        const guildId = req.params.id;
        const player = client.kazagumo?.players?.get(guildId);

        if (!player) {
            return res.json({ queue: [], current: null });
        }

        const current = player.queue.current;
        res.json({
            current: current ? {
                title: current.title,
                author: current.author,
                duration: current.length,
                position: player.position,
                thumbnail: current.thumbnail,
                uri: current.uri,
                requester: current.requester?.tag || 'Unknown'
            } : null,
            queue: player.queue.map((t, i) => ({
                index: i + 1,
                title: t.title,
                author: t.author,
                duration: t.length,
                thumbnail: t.thumbnail,
                uri: t.uri,
                requester: t.requester?.tag || 'Unknown'
            })),
            totalDuration: player.queue.reduce((acc, t) => acc + (t.length || 0), 0),
            paused: player.paused,
            volume: player.volume,
            loop: player.loop
        });
    });

    app.post('/api/server/:id/search', isAuthenticated, async (req, res) => {
        const guildId = req.params.id;
        const { query, source = 'youtube' } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query required' });
        }

        try {
            const result = await client.kazagumo.search(query, {
                requester: { id: req.user.id, tag: `${req.user.username}#${req.user.discriminator}` },
                engine: source
            });

            res.json({
                tracks: result.tracks.slice(0, 10).map(t => ({
                    title: t.title,
                    author: t.author,
                    duration: t.length,
                    thumbnail: t.thumbnail,
                    uri: t.uri,
                    source: t.sourceName
                })),
                type: result.type
            });
        } catch (error) {
            res.status(500).json({ error: 'Search failed' });
        }
    });

    app.post('/api/server/:id/play', isAuthenticated, async (req, res) => {
        const guildId = req.params.id;
        const { uri } = req.body;
        const guild = client.guilds.cache.get(guildId);

        if (!guild || !uri) {
            return res.status(400).json({ error: 'Invalid request' });
        }

        const player = client.kazagumo.players.get(guildId);
        if (!player) {
            return res.status(400).json({ error: 'No active player. Start playing from Discord first.' });
        }

        try {
            const result = await client.kazagumo.search(uri, {
                requester: { id: req.user.id, tag: `${req.user.username}#${req.user.discriminator}` }
            });

            if (!result.tracks.length) {
                return res.status(404).json({ error: 'Track not found' });
            }

            const track = result.tracks[0];
            player.queue.add(track);

            if (!player.playing && !player.paused) {
                player.play();
            }

            res.json({ success: true, track: { title: track.title, author: track.author } });
        } catch (error) {
            res.status(500).json({ error: 'Failed to add track' });
        }
    });

    app.delete('/api/server/:id/queue/:index', isAuthenticated, (req, res) => {
        const guildId = req.params.id;
        const index = parseInt(req.params.index);
        const player = client.kazagumo?.players?.get(guildId);

        if (!player) {
            return res.status(404).json({ error: 'No active player' });
        }

        if (index < 0 || index >= player.queue.size) {
            return res.status(400).json({ error: 'Invalid index' });
        }

        const removed = player.queue.splice(index, 1);
        res.json({ success: true, removed: removed[0]?.title });
    });

    app.post('/api/server/:id/volume', isAuthenticated, (req, res) => {
        const guildId = req.params.id;
        const { volume } = req.body;
        const player = client.kazagumo?.players?.get(guildId);

        if (!player) {
            return res.status(404).json({ error: 'No active player' });
        }

        const vol = Math.min(150, Math.max(0, parseInt(volume) || 100));
        player.setVolume(vol);
        res.json({ success: true, volume: vol });
    });

    app.post('/api/server/:id/seek', isAuthenticated, (req, res) => {
        const guildId = req.params.id;
        const { position } = req.body;
        const player = client.kazagumo?.players?.get(guildId);

        if (!player || !player.queue.current) {
            return res.status(404).json({ error: 'No active player' });
        }

        const pos = Math.min(player.queue.current.length, Math.max(0, parseInt(position) || 0));
        player.seek(pos);
        res.json({ success: true, position: pos });
    });

    app.get('/api/server/:id/analytics', isAuthenticated, (req, res) => {
        const guildId = req.params.id;
        const days = parseInt(req.query.days) || 7;

        const stats = client.db.getGuildStats(guildId, days);
        const leaderboard = client.db.getLeaderboard('songs', guildId, 10);
        
        res.json({ stats, leaderboard });
    });

    app.get('/api/playlists', isAuthenticated, (req, res) => {
        const playlists = client.db.getUserPlaylists(req.user.id);
        res.json({ playlists });
    });

    app.get('/api/playlists/:name', isAuthenticated, (req, res) => {
        const playlist = client.db.getPlaylist(req.user.id, req.params.name);
        
        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        res.json({ playlist });
    });

    app.post('/api/playlists', isAuthenticated, (req, res) => {
        const { name, songs = [] } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name required' });
        }

        const id = client.db.createPlaylist(req.user.id, name, songs);
        
        if (!id) {
            return res.status(400).json({ error: 'Playlist already exists' });
        }

        res.json({ success: true, id });
    });

    app.delete('/api/playlists/:name', isAuthenticated, (req, res) => {
        const success = client.db.deletePlaylist(req.user.id, req.params.name);
        res.json({ success });
    });

    app.get('/api/server/:id/history', isAuthenticated, (req, res) => {
        const guildId = req.params.id;
        const limit = parseInt(req.query.limit) || 50;
        
        const history = client.db.getServerHistory(guildId, limit);
        res.json({ history });
    });

    app.post('/api/theme', (req, res) => {
        const { theme } = req.body;
        if (!['dark', 'light', 'auto'].includes(theme)) {
            return res.status(400).json({ error: 'Invalid theme' });
        }
        req.session.theme = theme;
        res.json({ success: true, theme });
    });


    app.get('/server/:id/commands', isAuthenticated, (req, res) => {
        const guildId = req.params.id;
        const guild = client.guilds.cache.get(guildId);
        
        if (!guild) {
            return res.redirect('/dashboard');
        }

        const userGuild = req.user.guilds?.find(g => g.id === guildId);
        if (!userGuild || !(userGuild.permissions & 0x20)) {
            return res.status(403).render('error', { message: 'No permission' });
        }

        const categories = {};
        client.commands.forEach(cmd => {
            const cat = cmd.category || 'other';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push({
                name: cmd.data.name,
                description: cmd.data.description,
                category: cat
            });
        });

        const permissions = client.db.getAllCommandPermissions(guildId);
        const permMap = {};
        permissions.forEach(p => {
            permMap[p.command_name] = p;
        });

        res.render('commands-manage', { 
            guild,
            categories,
            permissions: permMap,
            roles: guild.roles.cache.filter(r => r.id !== guild.id).sort((a, b) => b.position - a.position)
        });
    });

    app.get('/api/server/:id/commands', isAuthenticated, (req, res) => {
        const guildId = req.params.id;
        const userGuild = req.user.guilds?.find(g => g.id === guildId);
        
        if (!userGuild || !(userGuild.permissions & 0x20)) {
            return res.status(403).json({ error: 'No permission' });
        }

        const permissions = client.db.getAllCommandPermissions(guildId);
        
        const commands = [];
        client.commands.forEach(cmd => {
            const perm = permissions.find(p => p.command_name === cmd.data.name);
            commands.push({
                name: cmd.data.name,
                description: cmd.data.description,
                category: cmd.category || 'other',
                enabled: perm ? !!perm.enabled : true,
                allowed_roles: perm?.allowed_roles || [],
                allowed_users: perm?.allowed_users || [],
                denied_roles: perm?.denied_roles || [],
                denied_users: perm?.denied_users || [],
                require_dj: perm?.require_dj || false
            });
        });

        res.json({ commands });
    });

    app.post('/api/server/:id/commands/:command', isAuthenticated, (req, res) => {
        const guildId = req.params.id;
        const commandName = req.params.command;
        const userGuild = req.user.guilds?.find(g => g.id === guildId);
        
        if (!userGuild || !(userGuild.permissions & 0x20)) {
            return res.status(403).json({ error: 'No permission' });
        }

        if (!client.commands.has(commandName)) {
            return res.status(404).json({ error: 'Command not found' });
        }

        const { enabled, allowed_roles, allowed_users, denied_roles, denied_users, require_dj } = req.body;

        client.db.setCommandPermission(guildId, commandName, {
            enabled: enabled !== undefined ? enabled : true,
            allowed_roles: allowed_roles || [],
            allowed_users: allowed_users || [],
            denied_roles: denied_roles || [],
            denied_users: denied_users || [],
            require_dj: require_dj || false
        });

        res.json({ success: true });
    });

    app.post('/api/server/:id/commands/:command/toggle', isAuthenticated, (req, res) => {
        const guildId = req.params.id;
        const commandName = req.params.command;
        const userGuild = req.user.guilds?.find(g => g.id === guildId);
        
        if (!userGuild || !(userGuild.permissions & 0x20)) {
            return res.status(403).json({ error: 'No permission' });
        }

        if (!client.commands.has(commandName)) {
            return res.status(404).json({ error: 'Command not found' });
        }

        const { enabled } = req.body;
        client.db.updateCommandEnabled(guildId, commandName, enabled);

        res.json({ success: true, enabled });
    });

    app.post('/api/server/:id/commands/bulk', isAuthenticated, (req, res) => {
        const guildId = req.params.id;
        const userGuild = req.user.guilds?.find(g => g.id === guildId);
        
        if (!userGuild || !(userGuild.permissions & 0x20)) {
            return res.status(403).json({ error: 'No permission' });
        }

        const { commands } = req.body;
        
        if (!Array.isArray(commands)) {
            return res.status(400).json({ error: 'Commands must be an array' });
        }

        let updated = 0;
        for (const cmd of commands) {
            if (client.commands.has(cmd.name)) {
                client.db.setCommandPermission(guildId, cmd.name, {
                    enabled: cmd.enabled !== undefined ? cmd.enabled : true,
                    allowed_roles: cmd.allowed_roles || [],
                    allowed_users: cmd.allowed_users || [],
                    denied_roles: cmd.denied_roles || [],
                    denied_users: cmd.denied_users || [],
                    require_dj: cmd.require_dj || false
                });
                updated++;
            }
        }

        res.json({ success: true, updated });
    });

    app.delete('/api/server/:id/commands', isAuthenticated, (req, res) => {
        const guildId = req.params.id;
        const userGuild = req.user.guilds?.find(g => g.id === guildId);
        
        if (!userGuild || !(userGuild.permissions & 0x20)) {
            return res.status(403).json({ error: 'No permission' });
        }

        const deleted = client.db.resetAllCommandPermissions(guildId);
        res.json({ success: true, deleted });
    });

    app.post('/api/server/:id/commands/category/:category', isAuthenticated, (req, res) => {
        const guildId = req.params.id;
        const category = req.params.category;
        const { enabled } = req.body;
        const userGuild = req.user.guilds?.find(g => g.id === guildId);
        
        if (!userGuild || !(userGuild.permissions & 0x20)) {
            return res.status(403).json({ error: 'No permission' });
        }

        let updated = 0;
        client.commands.forEach(cmd => {
            if (cmd.category === category) {
                client.db.updateCommandEnabled(guildId, cmd.data.name, enabled);
                updated++;
            }
        });

        res.json({ success: true, updated });
    });

    app.use((err, req, res, next) => {
        console.error(err);
        res.status(500).render('error', { message: 'Something went wrong!' });
    });

    app.use((req, res) => {
        res.status(404).render('error', { message: 'Page not found' });
    });

    const port = process.env.DASHBOARD_PORT || 3000;
    const server = app.listen(port, () => {
        client.logger.success(`Dashboard running on http://localhost:${port}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            client.logger.error(`Port ${port} is already in use. Trying alternative port...`);
            
            const altPort = port + 1;
            app.listen(altPort, () => {
                client.logger.success(`Dashboard running on http://localhost:${altPort}`);
            }).on('error', (altErr) => {
                client.logger.error(`Failed to start dashboard: ${altErr.message}`);
                client.logger.warn('Continuing without dashboard...');
            });
        } else {
            client.logger.error(`Failed to start dashboard: ${err.message}`);
            client.logger.warn('Continuing without dashboard...');
        }
    });

    return app;
}
