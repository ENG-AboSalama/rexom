import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } from 'discord.js';
import { Colors, errorEmbed } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('View command and music logs')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('commands')
                .setDescription('View recent command usage')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('Filter by user')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option.setName('limit')
                        .setDescription('Number of logs to show')
                        .setRequired(false)
                        .setMinValue(5)
                        .setMaxValue(50)
                )
        )
        .addSubcommand(sub =>
            sub.setName('music')
                .setDescription('View music activity logs')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Filter by action type')
                        .setRequired(false)
                        .addChoices(
                            { name: '▶️ Play', value: 'play' },
                            { name: '⏭️ Skip', value: 'skip' },
                            { name: '⏹️ Stop', value: 'stop' },
                            { name: '🎚️ Filter', value: 'filter' },
                            { name: '📋 Playlist', value: 'playlist' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('errors')
                .setDescription('View recent errors')
        )
        .addSubcommand(sub =>
            sub.setName('clear')
                .setDescription('Clear logs')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of logs to clear')
                        .setRequired(true)
                        .addChoices(
                            { name: '📝 Commands', value: 'commands' },
                            { name: '🎵 Music', value: 'music' },
                            { name: '❌ Errors', value: 'errors' },
                            { name: '🗑️ All Logs', value: 'all' }
                        )
                )
        )
        .addSubcommand(sub =>
            sub.setName('export')
                .setDescription('Export logs to a file')
        ),
    
    category: 'admin',
    cooldown: 5,

    async execute(client, interaction) {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'commands':
                return await showCommandLogs(client, interaction);
            case 'music':
                return await showMusicLogs(client, interaction);
            case 'errors':
                return await showErrorLogs(client, interaction);
            case 'clear':
                return await clearLogs(client, interaction);
            case 'export':
                return await exportLogs(client, interaction);
        }
    }
};

async function showCommandLogs(client, interaction) {
    await interaction.deferReply({ ephemeral: true });

    const user = interaction.options.getUser('user');
    const limit = interaction.options.getInteger('limit') || 20;

    let logs = client.db.getCommandLogs(interaction.guildId, limit);

    if (user) {
        logs = logs.filter(log => log.userId === user.id);
    }

    if (!logs || logs.length === 0) {
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.warning)
                    .setDescription('📭 No command logs found.')
            ]
        });
    }

    const embed = new EmbedBuilder()
        .setColor(Colors.primary)
        .setAuthor({ 
            name: '📝 Command Logs',
            iconURL: interaction.guild.iconURL()
        })
        .setDescription(
            logs.slice(0, 15).map(log => {
                const time = `<t:${Math.floor(log.timestamp / 1000)}:R>`;
                return `\`/${log.command}\` by <@${log.userId}> ${time}` +
                       (log.args ? `\n┗ Args: \`${log.args}\`` : '');
            }).join('\n\n')
        )
        .setFooter({ text: `Showing ${Math.min(logs.length, 15)} of ${logs.length} logs` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function showMusicLogs(client, interaction) {
    await interaction.deferReply({ ephemeral: true });

    const action = interaction.options.getString('action');

    let logs = client.db.getMusicLogs(interaction.guildId, 30);

    if (action) {
        logs = logs.filter(log => log.action === action);
    }

    if (!logs || logs.length === 0) {
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.warning)
                    .setDescription('📭 No music logs found.')
            ]
        });
    }

    const actionEmojis = {
        play: '▶️',
        skip: '⏭️',
        stop: '⏹️',
        pause: '⏸️',
        resume: '▶️',
        filter: '🎚️',
        playlist: '📋',
        volume: '🔊'
    };

    const embed = new EmbedBuilder()
        .setColor(Colors.primary)
        .setAuthor({ 
            name: '🎵 Music Activity Logs',
            iconURL: interaction.guild.iconURL()
        })
        .setDescription(
            logs.slice(0, 15).map(log => {
                const emoji = actionEmojis[log.action] || '🎵';
                const time = `<t:${Math.floor(log.timestamp / 1000)}:R>`;
                return `${emoji} **${log.action}** by <@${log.userId}> ${time}` +
                       (log.trackTitle ? `\n┗ ${truncate(log.trackTitle, 40)}` : '');
            }).join('\n\n')
        )
        .setFooter({ text: `Showing ${Math.min(logs.length, 15)} of ${logs.length} logs` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function showErrorLogs(client, interaction) {
    await interaction.deferReply({ ephemeral: true });

    const logs = client.db.getErrorLogs(interaction.guildId, 20);

    if (!logs || logs.length === 0) {
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setColor(Colors.success)
                    .setDescription('✅ No errors logged. Everything is running smoothly!')
            ]
        });
    }

    const embed = new EmbedBuilder()
        .setColor(Colors.error)
        .setAuthor({ 
            name: '❌ Error Logs',
            iconURL: interaction.guild.iconURL()
        })
        .setDescription(
            logs.slice(0, 10).map(log => {
                const time = `<t:${Math.floor(log.timestamp / 1000)}:R>`;
                return `**${log.command || 'System'}** ${time}\n` +
                       `\`\`\`${truncate(log.error, 100)}\`\`\``;
            }).join('\n')
        )
        .setFooter({ text: `Showing ${Math.min(logs.length, 10)} of ${logs.length} errors` })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

async function clearLogs(client, interaction) {
    const type = interaction.options.getString('type');

    const embed = new EmbedBuilder()
        .setColor(Colors.warning)
        .setDescription(`⚠️ Are you sure you want to clear **${type === 'all' ? 'all logs' : type + ' logs'}**?\n\nThis action cannot be undone.`);

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`logs_clear_confirm_${type}`)
                .setLabel('Confirm')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🗑️'),
            new ButtonBuilder()
                .setCustomId('logs_clear_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });
}

async function exportLogs(client, interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const commandLogs = client.db.getCommandLogs(interaction.guildId, 100);
        const musicLogs = client.db.getMusicLogs(interaction.guildId, 100);
        const errorLogs = client.db.getErrorLogs(interaction.guildId, 50);

        const exportData = {
            guild: {
                id: interaction.guildId,
                name: interaction.guild.name,
                exportedAt: new Date().toISOString()
            },
            commandLogs: commandLogs || [],
            musicLogs: musicLogs || [],
            errorLogs: errorLogs || []
        };

        const jsonContent = JSON.stringify(exportData, null, 2);
        const buffer = Buffer.from(jsonContent, 'utf-8');

        await interaction.editReply({
            content: '📁 Here are your exported logs:',
            files: [{
                attachment: buffer,
                name: `rexom-logs-${interaction.guildId}-${Date.now()}.json`
            }]
        });

    } catch (error) {
        client.logger.error('Export logs error:', error);
        await interaction.editReply({
            embeds: [errorEmbed('Failed to export logs.')]
        });
    }
}

function truncate(str, length) {
    if (!str) return 'Unknown';
    return str.length > length ? str.substring(0, length - 3) + '...' : str;
}
