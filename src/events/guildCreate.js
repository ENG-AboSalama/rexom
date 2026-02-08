import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export default {
    name: 'guildCreate',

    async execute(client, guild) {
        client.logger.info(`Joined new guild: ${guild.name} (${guild.id})`);

        client.db.getGuildSettings(guild.id);

        const systemChannel = guild.systemChannel 
            || guild.channels.cache.find(c => 
                c.type === 0 && 
                c.permissionsFor(guild.members.me).has(['SendMessages', 'EmbedLinks'])
            );

        if (!systemChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0xe94560)
            .setTitle('🎵 Thanks for adding Rexom!')
            .setDescription(
                'I\'m a modern music bot with **crystal-clear audio** powered by Lavalink.\n\n' +
                '**Getting Started:**\n' +
                '• `/play <song>` - Play music\n' +
                '• `/help` - View all commands\n' +
                '• `/setup` - Create a music request channel\n\n' +
                '**Features:**\n' +
                '✨ Best audio quality with Lavalink\n' +
                '📋 Playlist support\n' +
                '🎛️ Audio filters\n' +
                '🌐 Multi-language support\n' +
                '🔧 Customizable settings'
            )
            .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
            .setFooter({ text: 'Use /help for more information' })
            .setTimestamp();

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Support Server')
                    .setURL(process.env.SUPPORT_SERVER || 'https://discord.gg/rexom')
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('💬'),
                new ButtonBuilder()
                    .setLabel('Dashboard')
                    .setURL(process.env.DASHBOARD_URL || 'https://rexom.dev')
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('🌐')
            );

        try {
            await systemChannel.send({ embeds: [embed], components: [row] });
        } catch (error) {
        }
    }
};
