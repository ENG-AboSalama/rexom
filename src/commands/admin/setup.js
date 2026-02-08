import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } from 'discord.js';
import { Colors, successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Create a dedicated music request channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Existing channel to use (leave empty to create new)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        ),
    
    category: 'admin',
    cooldown: 30,

    async execute(client, interaction) {
        await interaction.deferReply();

        let channel = interaction.options.getChannel('channel');

        try {
            if (!channel) {
                channel = await interaction.guild.channels.create({
                    name: '🎵-music-requests',
                    type: ChannelType.GuildText,
                    topic: 'Drop a song link or name to play music! | Powered by Rexom',
                    permissionOverwrites: [
                        {
                            id: interaction.guild.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                        },
                        {
                            id: client.user.id,
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.EmbedLinks,
                                PermissionFlagsBits.ManageMessages
                            ],
                        }
                    ]
                });
            }

            const embed = new EmbedBuilder()
                .setColor(Colors.primary)
                .setAuthor({ name: 'Rexom Music', iconURL: client.user.displayAvatarURL() })
                .setTitle('🎵 Music Player')
                .setDescription(
                    '**Now Playing:** Nothing\n\n' +
                    '```\n' +
                    '                    No music playing\n' +
                    '                                      \n' +
                    '      advancement advancement advancement     \n' +
                    '```\n' +
                    '`00:00` advancement advancement advancement advancement advancement advancement advancement advancement advancement `00:00`'
                )
                .setImage('https://i.imgur.com/CQOxDuU.png') // Placeholder image
                .setFooter({ text: 'Type a song name or paste a URL to play!' });

            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('music_previous')
                        .setEmoji('⏮️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_playpause')
                        .setEmoji('⏯️')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('music_skip')
                        .setEmoji('⏭️')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_stop')
                        .setEmoji('⏹️')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('music_loop')
                        .setEmoji('🔁')
                        .setStyle(ButtonStyle.Secondary)
                );

            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('music_shuffle')
                        .setEmoji('🔀')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_voldown')
                        .setEmoji('🔉')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_volup')
                        .setEmoji('🔊')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_queue')
                        .setEmoji('📋')
                        .setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder()
                        .setCustomId('music_favorite')
                        .setEmoji('❤️')
                        .setStyle(ButtonStyle.Secondary)
                );

            const message = await channel.send({
                embeds: [embed],
                components: [row1, row2]
            });

            client.db.updateGuildSettings(interaction.guildId, {
                request_channel_id: channel.id,
                player_message_id: message.id
            });

            await interaction.editReply({
                embeds: [successEmbed(`✅ Music request channel set up in ${channel}\n\nUsers can now type song names or paste URLs there to play music!`)]
            });

        } catch (error) {
            client.logger.error('Setup error:', error);
            await interaction.editReply({
                embeds: [errorEmbed('Failed to set up the music channel. Please check my permissions.')]
            });
        }
    }
};
