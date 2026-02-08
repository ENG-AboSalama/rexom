import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import { Colors, successEmbed, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Configure server settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('View current settings')
        )
        .addSubcommand(sub =>
            sub.setName('language')
                .setDescription('Set bot language')
                .addStringOption(option =>
                    option.setName('lang')
                        .setDescription('Language')
                        .setRequired(true)
                        .addChoices(
                            { name: '🇺🇸 English', value: 'en' },
                            { name: '🇸🇦 العربية', value: 'ar' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('volume')
                .setDescription('Set default volume')
                .addIntegerOption(option =>
                    option.setName('level')
                        .setDescription('Default volume (1-150)')
                        .setMinValue(1)
                        .setMaxValue(150)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('maxvolume')
                .setDescription('Set maximum allowed volume')
                .addIntegerOption(option =>
                    option.setName('level')
                        .setDescription('Max volume (1-150)')
                        .setMinValue(1)
                        .setMaxValue(150)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('dj')
                .setDescription('Configure DJ role')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('DJ role (leave empty to remove)')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('announce')
                .setDescription('Toggle now playing announcements')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable announcements')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('voteskip')
                .setDescription('Configure vote skip')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable vote skip')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('ratio')
                        .setDescription('Required percentage (10-100)')
                        .setMinValue(10)
                        .setMaxValue(100)
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('autoleave')
                .setDescription('Configure auto-leave when alone')
                .addBooleanOption(option =>
                    option.setName('enabled')
                        .setDescription('Enable auto-leave')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('timeout')
                        .setDescription('Seconds before leaving (30-600)')
                        .setMinValue(30)
                        .setMaxValue(600)
                        .setRequired(false)
                )
        ),
    
    category: 'admin',
    cooldown: 3,

    async execute(client, interaction) {
        const subcommand = interaction.options.getSubcommand();
        const settings = client.db.getGuildSettings(interaction.guildId);

        switch (subcommand) {
            case 'view':
                return viewSettings(client, interaction, settings);
            case 'language':
                return setLanguage(client, interaction, settings);
            case 'volume':
                return setVolume(client, interaction, settings);
            case 'maxvolume':
                return setMaxVolume(client, interaction, settings);
            case 'dj':
                return setDJRole(client, interaction, settings);
            case 'announce':
                return setAnnounce(client, interaction, settings);
            case 'voteskip':
                return setVoteSkip(client, interaction, settings);
            case 'autoleave':
                return setAutoLeave(client, interaction, settings);
        }
    }
};

async function viewSettings(client, interaction, settings) {
    const djRole = settings.dj_role_id 
        ? `<@&${settings.dj_role_id}>` 
        : 'Not set';

    const embed = new EmbedBuilder()
        .setColor(Colors.primary)
        .setTitle('⚙️ Server Settings')
        .addFields(
            {
                name: '🌐 Language',
                value: settings.language === 'ar' ? '🇸🇦 العربية' : '🇺🇸 English',
                inline: true
            },
            {
                name: '🔊 Default Volume',
                value: `${settings.default_volume || 100}%`,
                inline: true
            },
            {
                name: '🔊 Max Volume',
                value: `${settings.max_volume || 150}%`,
                inline: true
            },
            {
                name: '🎧 DJ Role',
                value: djRole,
                inline: true
            },
            {
                name: '📢 Announcements',
                value: settings.announce_songs ? '✅ Enabled' : '❌ Disabled',
                inline: true
            },
            {
                name: '🗳️ Vote Skip',
                value: settings.vote_skip 
                    ? `✅ ${Math.round((settings.vote_skip_ratio || 0.5) * 100)}%`
                    : '❌ Disabled',
                inline: true
            },
            {
                name: '👋 Auto-Leave',
                value: settings.auto_leave 
                    ? `✅ ${settings.auto_leave_timeout || 300}s`
                    : '❌ Disabled',
                inline: true
            },
            {
                name: '🔂 24/7 Mode',
                value: settings.mode_247 ? '✅ Enabled' : '❌ Disabled',
                inline: true
            }
        )
        .setFooter({ text: 'Use /settings <option> to change settings' });

    await interaction.reply({ embeds: [embed] });
}

async function setLanguage(client, interaction, settings) {
    const lang = interaction.options.getString('lang');
    
    client.db.updateGuildSettings(interaction.guildId, { language: lang });

    const langName = lang === 'ar' ? '🇸🇦 العربية' : '🇺🇸 English';
    await interaction.reply({
        embeds: [successEmbed(`Language set to **${langName}**`)]
    });
}

async function setVolume(client, interaction, settings) {
    const level = interaction.options.getInteger('level');
    
    client.db.updateGuildSettings(interaction.guildId, { default_volume: level });

    await interaction.reply({
        embeds: [successEmbed(`Default volume set to **${level}%**`)]
    });
}

async function setMaxVolume(client, interaction, settings) {
    const level = interaction.options.getInteger('level');
    
    client.db.updateGuildSettings(interaction.guildId, { max_volume: level });

    await interaction.reply({
        embeds: [successEmbed(`Max volume set to **${level}%**`)]
    });
}

async function setDJRole(client, interaction, settings) {
    const role = interaction.options.getRole('role');
    
    if (role) {
        client.db.updateGuildSettings(interaction.guildId, { dj_role_id: role.id });
        await interaction.reply({
            embeds: [successEmbed(`DJ role set to ${role}`)]
        });
    } else {
        client.db.updateGuildSettings(interaction.guildId, { dj_role_id: null });
        await interaction.reply({
            embeds: [successEmbed('DJ role removed')]
        });
    }
}

async function setAnnounce(client, interaction, settings) {
    const enabled = interaction.options.getBoolean('enabled');
    
    client.db.updateGuildSettings(interaction.guildId, { announce_songs: enabled ? 1 : 0 });

    await interaction.reply({
        embeds: [successEmbed(`Now playing announcements **${enabled ? 'enabled' : 'disabled'}**`)]
    });
}

async function setVoteSkip(client, interaction, settings) {
    const enabled = interaction.options.getBoolean('enabled');
    const ratio = interaction.options.getInteger('ratio');
    
    const updates = { vote_skip: enabled ? 1 : 0 };
    if (ratio) {
        updates.vote_skip_ratio = ratio / 100;
    }
    
    client.db.updateGuildSettings(interaction.guildId, updates);

    let message = `Vote skip **${enabled ? 'enabled' : 'disabled'}**`;
    if (enabled && ratio) {
        message += ` (${ratio}% required)`;
    }

    await interaction.reply({
        embeds: [successEmbed(message)]
    });
}

async function setAutoLeave(client, interaction, settings) {
    const enabled = interaction.options.getBoolean('enabled');
    const timeout = interaction.options.getInteger('timeout');
    
    const updates = { auto_leave: enabled ? 1 : 0 };
    if (timeout) {
        updates.auto_leave_timeout = timeout;
    }
    
    client.db.updateGuildSettings(interaction.guildId, updates);

    let message = `Auto-leave **${enabled ? 'enabled' : 'disabled'}**`;
    if (enabled && timeout) {
        message += ` (${timeout}s timeout)`;
    }

    await interaction.reply({
        embeds: [successEmbed(message)]
    });
}
