import { SlashCommandBuilder, EmbedBuilder, version as djsVersion } from 'discord.js';
import { Colors } from '../../utils/embeds.js';
import os from 'os';

export default {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Show bot statistics and system info'),
    
    category: 'utility',
    cooldown: 10,

    async execute(client, interaction) {
        await interaction.deferReply();

        const guilds = client.guilds.cache.size;
        const users = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
        const channels = client.channels.cache.size;
        const activePlayers = client.kazagumo.players.size;

        const memUsage = process.memoryUsage();
        const heapUsed = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
        const heapTotal = (memUsage.heapTotal / 1024 / 1024).toFixed(2);

        const cpus = os.cpus();
        const cpuModel = cpus[0]?.model || 'Unknown';
        const cpuCores = cpus.length;
        const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);

        let lavalinkInfo = 'Not connected';
        const node = client.kazagumo.shoukaku.nodes.values().next().value;
        
        if (node && node.state === 1 && node.stats) {
            const stats = node.stats;
            lavalinkInfo = `Players: ${stats.players} (${stats.playingPlayers} playing)\n` +
                `CPU: ${(stats.cpu?.lavalinkLoad * 100).toFixed(1)}%\n` +
                `Memory: ${Math.round(stats.memory?.used / 1024 / 1024)}MB`;
        }

        const embed = new EmbedBuilder()
            .setColor(Colors.primary)
            .setAuthor({ 
                name: 'Rexom Statistics', 
                iconURL: client.user.displayAvatarURL() 
            })
            .addFields(
                {
                    name: '📊 General',
                    value: [
                        `**Servers:** ${guilds.toLocaleString()}`,
                        `**Users:** ${users.toLocaleString()}`,
                        `**Channels:** ${channels.toLocaleString()}`,
                        `**Commands:** ${client.commands.size}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🎵 Music',
                    value: [
                        `**Active Players:** ${activePlayers}`,
                        `**Lavalink:**`,
                        lavalinkInfo
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '💻 System',
                    value: [
                        `**Platform:** ${os.platform()} ${os.arch()}`,
                        `**Node.js:** ${process.version}`,
                        `**Discord.js:** v${djsVersion}`,
                        `**CPU:** ${cpuModel.split('@')[0].trim()} (${cpuCores} cores)`
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '📈 Memory',
                    value: [
                        `**Bot Heap:** ${heapUsed}/${heapTotal} MB`,
                        `**System:** ${(totalMem - parseFloat(freeMem)).toFixed(2)}/${totalMem} GB`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '⏱️ Uptime',
                    value: formatUptime(client.uptime),
                    inline: true
                }
            )
            .setFooter({ 
                text: `Shard: ${interaction.guild?.shardId ?? 0} • Process ID: ${process.pid}` 
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};

function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    return [
        days > 0 ? `${days} day${days !== 1 ? 's' : ''}` : '',
        hours % 24 > 0 ? `${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}` : '',
        minutes % 60 > 0 ? `${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}` : '',
        `${seconds % 60} second${seconds % 60 !== 1 ? 's' : ''}`
    ].filter(Boolean).join(', ');
}
