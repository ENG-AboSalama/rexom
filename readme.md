<p align="center">
  <img 
    src="banner.png"
    alt="Rexom Banner"
    style="width: 65%; object-fit: contain;"
  />
</p>

<h1 align="center">Rexom</h1>
<p align="center">
  <strong>The Ultimate Discord Music Bot</strong>
  <br />
  Resurrection v1.0.0
</p>

<p align="center">
  <a href="https://github.com/ENG-AboSalama/rexom"><img src="https://img.shields.io/badge/version-resurrection%20v1.0.0-e94560?style=for-the-badge" alt="Version" /></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" /></a>
  <a href="https://discord.js.org/"><img src="https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="discord.js" /></a>
  <a href="https://lavalink.dev/"><img src="https://img.shields.io/badge/lavalink-v4-7C3AED?style=for-the-badge" alt="Lavalink" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge" alt="License" /></a>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#commands">Commands</a> •
  <a href="#dashboard">Dashboard</a> •
  <a href="#deployment">Deployment</a>
</p>

---

## Features

### Music
- Play from **YouTube**, **Spotify**, **SoundCloud**, **Deezer** and more
- Queue management with pagination
- Loop modes (Off, Song, Queue)
- Shuffle, skip, seek, rewind, forward
- Volume control (0-150%)
- Autoplay related tracks
- Personal favorites & playlists
- Play history tracking
- AI-powered music recommendations
- Live radio stations from around the world
- Lyrics fetching via Genius

### Audio Effects (`/audio`)
- Unified command with interactive menu
- Bassboost, Nightcore, Vaporwave, 8D
- Tremolo, Vibrato, Karaoke
- Speed & Pitch control
- 15-band Equalizer with presets
- Multi-filter stacking
- One-click presets (Gaming, Chill, Party, Study, etc.)

### Dashboard
- Discord OAuth2 login
- Server settings management
- Live player controls
- Queue management
- Playlist management
- Bot analytics & statistics

### Admin
- Per-server settings
- DJ role support
- 24/7 voice mode
- Custom default volume
- Song announcements toggle
- Music request channel setup
- Temporary voice channels

---

## Requirements

- **Node.js** 18.0.0+
- **Java** 17+ (for Lavalink)
- **Lavalink** v4

---

## Installation

### 1. Clone

```bash
git clone https://github.com/ENG-AboSalama/rexom.git
cd rexom
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_application_id
DISCORD_CLIENT_SECRET=your_client_secret

LAVALINK_HOST=localhost
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass

DASHBOARD_PORT=3000
SESSION_SECRET=your_random_secret
CALLBACK_URL=http://localhost:3000/callback
```

### 4. Start Lavalink

```bash
cd lavalink
java -jar Lavalink.jar
```

### 5. Start the bot

```bash
npm start
```

Slash commands are deployed automatically on startup.

---

## Docker

```bash
cp .env.example .env
# edit .env with your values
docker-compose up -d
```

---

## Commands

### Music

| Command | Description |
|---------|-------------|
| `/play <query>` | Play a song or playlist |
| `/search <query>` | Search and select from results |
| `/playtop <query>` | Add to top of queue |
| `/skip` | Skip current track |
| `/skipto <position>` | Jump to position in queue |
| `/voteskip` | Vote to skip |
| `/previous` | Play previous track |
| `/stop` | Stop and clear queue |
| `/pause` | Pause playback |
| `/resume` | Resume playback |
| `/replay` | Restart current track |
| `/queue` | View queue |
| `/clear` | Clear the queue |
| `/shuffle` | Shuffle the queue |
| `/loop [mode]` | Set loop (off/song/queue) |
| `/volume [level]` | Set volume (0-150) |
| `/seek <time>` | Seek to position |
| `/forward [seconds]` | Skip forward |
| `/rewind [seconds]` | Skip backward |
| `/nowplaying` | Current track with controls |
| `/move <from> <to>` | Move track in queue |
| `/remove <position>` | Remove from queue |
| `/grab` | Send track info to DMs |
| `/join` | Join voice channel |
| `/leave` | Leave voice channel |
| `/autoplay` | Toggle autoplay |
| `/lyrics` | Get lyrics |
| `/radio` | Play radio stations |
| `/liveradio` | Play live internet radio |
| `/discover` | AI music recommendations |
| `/recommend` | Get recommendations |
| `/leaderboard` | Top listeners |
| `/history` | Recently played tracks |

### Audio Effects

| Command | Description |
|---------|-------------|
| `/audio menu` | Interactive effects panel |
| `/audio filters` | Toggle audio filters |
| `/audio equalizer` | EQ presets |
| `/audio bassboost [level]` | Bass boost |
| `/audio nightcore` | Nightcore effect |
| `/audio rotation` | 8D audio |
| `/audio vaporwave` | Vaporwave effect |
| `/audio speed [value]` | Playback speed |
| `/audio pitch [value]` | Audio pitch |
| `/audio karaoke` | Vocal reduction |
| `/audio tremolo` | Tremolo effect |
| `/audio vibrato` | Vibrato effect |
| `/audio preset [name]` | Apply preset |
| `/audio reset` | Clear all effects |
| `/audio status` | Active effects |

### Playlists & Favorites

| Command | Description |
|---------|-------------|
| `/playlist create <name>` | Create playlist |
| `/playlist delete <name>` | Delete playlist |
| `/playlist list` | Your playlists |
| `/playlist view <name>` | View tracks |
| `/playlist add <name> <query>` | Add track |
| `/playlist remove <name> <position>` | Remove track |
| `/playlist play <name>` | Play playlist |
| `/savequeue <name>` | Save queue as playlist |
| `/favorites add` | Save current track |
| `/favorites list` | View favorites |
| `/favorites play` | Play favorites |
| `/favorites clear` | Clear all favorites |

### Admin

| Command | Description |
|---------|-------------|
| `/247` | Toggle 24/7 mode |
| `/settings` | Server settings |
| `/setup` | Music request channel |
| `/tempvoice` | Temp voice channels |
| `/logs` | Command usage logs |

### Utility

| Command | Description |
|---------|-------------|
| `/help` | Command list |
| `/ping` | Bot latency |
| `/stats` | Bot statistics |
| `/invite` | Invite link |

---

## Project Structure

```
rexom/
├── src/
│   ├── index.js
│   ├── commands/
│   │   ├── music/
│   │   ├── admin/
│   │   └── utility/
│   ├── components/
│   │   ├── buttons/
│   │   └── selectMenus/
│   ├── core/
│   │   ├── Database.js
│   │   ├── ErrorHandler.js
│   │   └── Logger.js
│   ├── dashboard/
│   │   ├── server.js
│   │   └── views/
│   ├── events/
│   ├── handlers/
│   └── utils/
├── data/
├── lavalink/
├── logs/
├── .env.example
├── deploy-commands.js
├── docker-compose.yml
├── Dockerfile
└── package.json
```

---

## License

[MIT](LICENSE)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/ENG-AboSalama">AboSalama</a>
</p>
