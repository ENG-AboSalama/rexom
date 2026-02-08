import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { Colors } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot and API latency'),
    
    category: 'utility',
    cooldown: 5,

    async execute(client, interaction) {
        const sent = await interaction.deferReply({ fetchReply: true });
        
        const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
        const wsLatency = client.ws.ping;

        let lavalinkStatus = '❌ Disconnected';
        const node = client.kazagumo.shoukaku.nodes.values().next().value;
        
        if (node && node.state === 1) {
            const stats = node.stats;
            lavalinkStatus = `✅ Connected\n` +
                `Players: ${stats?.players || 0}\n` +
                `Memory: ${Math.round((stats?.memory?.used || 0) / 1024 / 1024)}MB`;
        }

        const avgLatency = (roundtrip + wsLatency) / 2;
        let color = Colors.success;
        let emoji = '🟢';
        
        if (avgLatency > 200) {
            color = Colors.warning;
            emoji = '🟡';
        }
        if (avgLatency > 500) {
            color = Colors.error;
            emoji = '🔴';
        }

        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`${emoji} Pong!`)
            .addFields(
                { name: '📡 Bot Latency', value: `\`${roundtrip}ms\``, inline: true },
                { name: '💓 API Latency', value: `\`${wsLatency}ms\``, inline: true },
                { name: '🎵 Lavalink', value: lavalinkStatus, inline: true }
            )
            .setFooter({ text: `Uptime: ${formatUptime(client.uptime)}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};

function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours % 24 > 0) parts.push(`${hours % 24}h`);
    if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
    if (seconds % 60 > 0) parts.push(`${seconds % 60}s`);

    return parts.join(' ') || '0s';
}
