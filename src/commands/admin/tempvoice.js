import { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import { Colors, successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('tempvoice')
        .setDescription('Configure temporary voice channels')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Set up temporary voice channels')
                .addChannelOption(option =>
                    option.setName('category')
                        .setDescription('Category for temp channels')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('disable')
                .setDescription('Disable temporary voice channels')
        )
        .addSubcommand(sub =>
            sub.setName('settings')
                .setDescription('Configure temp voice settings')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Channel name format. Use {user} or {username}')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option.setName('limit')
                        .setDescription('Default user limit (0 = unlimited)')
                        .setMinValue(0)
                        .setMaxValue(99)
                        .setRequired(false)
                )
        ),
    
    category: 'admin',
    cooldown: 10,

    async execute(client, interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'setup': return setupTempVoice(client, interaction);
            case 'disable': return disableTempVoice(client, interaction);
            case 'settings': return configureTempVoice(client, interaction);
        }
    }
};

async function setupTempVoice(client, interaction) {
    await interaction.deferReply();

    const category = interaction.options.getChannel('category');

    try {
        const createChannel = await interaction.guild.channels.create({
            name: '➕ Join to Create',
            type: ChannelType.GuildVoice,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                }
            ]
        });

        client.db.setTempChannelConfig(interaction.guildId, {
            category_id: category.id,
            create_channel_id: createChannel.id,
            name_format: "{user}'s Channel",
            user_limit: 0
        });

        const embed = new EmbedBuilder()
            .setColor(Colors.success)
            .setTitle('✅ Temporary Voice Channels Enabled')
            .setDescription(
                `Created "Join to Create" channel in ${category}\n\n` +
                `**How it works:**\n` +
                `• Users join the "Join to Create" channel\n` +
                `• A private channel is created for them\n` +
                `• They become the owner with full control\n` +
                `• The channel is deleted when empty`
            );

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        client.logger.error('Temp voice setup error:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Failed to set up temporary voice channels. Check my permissions.')]
        });
    }
}

async function disableTempVoice(client, interaction) {
    const config = client.db.getTempChannelConfig(interaction.guildId);

    if (!config) {
        return interaction.reply({
            embeds: [errorEmbed('Temporary voice channels are not set up.')],
            ephemeral: true
        });
    }

    try {
        const channel = interaction.guild.channels.cache.get(config.create_channel_id);
        if (channel) await channel.delete('Temp voice disabled');
    } catch (e) {}

    client.db.deleteTempChannelConfig(interaction.guildId);

    await interaction.reply({
        embeds: [successEmbed('Temporary voice channels have been disabled.')]
    });
}

async function configureTempVoice(client, interaction) {
    const config = client.db.getTempChannelConfig(interaction.guildId);

    if (!config) {
        return interaction.reply({
            embeds: [errorEmbed('Temporary voice channels are not set up. Use `/tempvoice setup` first.')],
            ephemeral: true
        });
    }

    const nameFormat = interaction.options.getString('name');
    const userLimit = interaction.options.getInteger('limit');

    if (nameFormat === null && userLimit === null) {
        const embed = new EmbedBuilder()
            .setColor(Colors.primary)
            .setTitle('🎤 Temp Voice Settings')
            .addFields(
                { name: 'Name Format', value: `\`${config.name_format}\``, inline: true },
                { name: 'User Limit', value: config.user_limit === 0 ? 'Unlimited' : `${config.user_limit}`, inline: true }
            )
            .setFooter({ text: 'Use {user} or {username} in the name format' });

        return interaction.reply({ embeds: [embed] });
    }

    const updates = {};
    const changes = [];

    if (nameFormat !== null) {
        updates.name_format = nameFormat;
        changes.push(`Name format: \`${nameFormat}\``);
    }

    if (userLimit !== null) {
        updates.user_limit = userLimit;
        changes.push(`User limit: ${userLimit === 0 ? 'Unlimited' : userLimit}`);
    }

    client.db.updateTempChannelConfig(interaction.guildId, updates);

    await interaction.reply({
        embeds: [successEmbed(`Updated settings:\n${changes.join('\n')}`)]
    });
}
