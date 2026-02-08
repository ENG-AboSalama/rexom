import { ChannelType, PermissionFlagsBits } from 'discord.js';

export default {
    name: 'voiceStateUpdate',

    async execute(client, oldState, newState) {
        const guildId = oldState.guild?.id || newState.guild?.id;
        if (!guildId) return;

        if (oldState.member?.id === client.user.id && !newState.channelId) {
            const player = client.kazagumo.players.get(guildId);
            if (player) {
                player.destroy();
                client.logger.player('Disconnected', oldState.guild.name);
            }
        }

        if (oldState.channelId && !newState.channelId) {
            await handleChannelEmpty(client, oldState);
        }

        await handleTempVoice(client, oldState, newState);
    }
};

async function handleChannelEmpty(client, oldState) {
    const player = client.kazagumo.players.get(oldState.guild.id);
    if (!player) return;

    const voiceChannel = oldState.guild.channels.cache.get(player.voiceId);
    if (!voiceChannel) return;

    const members = voiceChannel.members.filter(m => !m.user.bot);
    
    if (members.size === 0) {
        const settings = client.db.getGuildSettings(oldState.guild.id);
        
        if (settings.auto_leave) {
            const timeout = (settings.auto_leave_timeout || 300) * 1000;

            if (player.emptyTimeout) {
                clearTimeout(player.emptyTimeout);
            }

            player.emptyTimeout = setTimeout(() => {
                const currentVoice = oldState.guild.channels.cache.get(player.voiceId);
                if (currentVoice) {
                    const currentMembers = currentVoice.members.filter(m => !m.user.bot);
                    if (currentMembers.size === 0) {
                        player.destroy();
                        client.logger.player('Auto-left', oldState.guild.name, 'Channel empty');
                    }
                }
            }, timeout);
        }
    }
}

async function handleTempVoice(client, oldState, newState) {
    const guild = oldState.guild || newState.guild;
    const config = client.db.getTempChannelConfig(guild.id);
    
    if (!config) return;

    if (newState.channelId === config.create_channel_id && newState.member) {
        try {
            const category = guild.channels.cache.get(config.category_id);
            if (!category) return;

            const channelName = (config.name_format || "{user}'s Channel")
                .replace('{user}', newState.member.displayName)
                .replace('{username}', newState.member.user.username);

            const tempChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                parent: category.id,
                userLimit: config.user_limit || 0,
                permissionOverwrites: [
                    {
                        id: newState.member.id,
                        allow: [
                            PermissionFlagsBits.ManageChannels,
                            PermissionFlagsBits.MoveMembers,
                            PermissionFlagsBits.MuteMembers,
                            PermissionFlagsBits.DeafenMembers,
                        ]
                    }
                ]
            });

            await newState.member.voice.setChannel(tempChannel);

            tempChannel.tempOwner = newState.member.id;

        } catch (error) {
            client.logger.error('Failed to create temp channel:', error);
        }
    }

    if (oldState.channelId && oldState.channelId !== config.create_channel_id) {
        const oldChannel = guild.channels.cache.get(oldState.channelId);
        
        if (oldChannel?.tempOwner && oldChannel.members.size === 0) {
            try {
                await oldChannel.delete('Temp channel empty');
            } catch (error) {
            }
        }
    }
}
