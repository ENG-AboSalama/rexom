import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Colors } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('invite')
        .setDescription('Get the bot invite link'),
    
    category: 'utility',
    aliases: ['inv', 'add'],
    cooldown: 5,

    async execute(client, interaction) {
        const inviteURL = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
        
        const embed = new EmbedBuilder()
            .setColor(Colors.primary)
            .setTitle('🎵 Invite Rexom')
            .setDescription('Click the button below to add Rexom to your server!')
            .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
            .addFields(
                {
                    name: '✨ Features',
                    value: [
                        '• High-quality music playback',
                        '• Multiple audio sources (YouTube, Spotify, SoundCloud...)',
                        '• Advanced audio effects & filters',
                        '• Playlist management',
                        '• Web dashboard',
                        '• 24/7 mode',
                        '• And much more!'
                    ].join('\n')
                }
            )
            .setFooter({ text: 'Thank you for choosing Rexom!' });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('Invite Rexom')
                    .setURL(inviteURL)
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('🎵'),
                new ButtonBuilder()
                    .setLabel('Support Server')
                    .setURL('https://discord.gg/your-server')
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('💬'),
                new ButtonBuilder()
                    .setLabel('GitHub')
                    .setURL('https://github.com/ENG-AboSalama/rexom')
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('📁')
            );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
};
