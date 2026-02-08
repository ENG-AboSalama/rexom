import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { Colors } from '../../utils/embeds.js';

export default {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View all commands and how to use them')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Get detailed info about a specific command')
                .setRequired(false)
                .setAutocomplete(true)
        ),
    
    category: 'utility',
    cooldown: 3,

    async execute(client, interaction) {
        const commandName = interaction.options.getString('command');

        if (commandName) {
            return showCommandDetails(client, interaction, commandName);
        }

        const categories = {};
        
        client.commands.forEach(cmd => {
            const category = cmd.category || 'other';
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(cmd);
        });

        const categoryInfo = {
            music: { emoji: '🎵', name: 'Music', description: 'Play and control music' },
            admin: { emoji: '⚙️', name: 'Admin', description: 'Server configuration' },
            utility: { emoji: '🔧', name: 'Utility', description: 'General utilities' },
            other: { emoji: '📦', name: 'Other', description: 'Miscellaneous commands' }
        };

        const embed = new EmbedBuilder()
            .setColor(Colors.primary)
            .setAuthor({ 
                name: 'Rexom - Help', 
                iconURL: client.user.displayAvatarURL() 
            })
            .setDescription(
                `Welcome to **Rexom** - Your premium music experience!\n\n` +
                `Use the menu below to browse commands by category, ` +
                `or use \`/help <command>\` for detailed info.\n\n` +
                `**Quick Start:**\n` +
                `• \`/play <song>\` - Play music\n` +
                `• \`/queue\` - View queue\n` +
                `• \`/filter\` - Apply audio effects\n\n` +
                `**Statistics:**\n` +
                `• Servers: ${client.guilds.cache.size}\n` +
                `• Commands: ${client.commands.size}`
            )
            .setThumbnail(client.user.displayAvatarURL({ size: 256 }));

        for (const [key, info] of Object.entries(categoryInfo)) {
            if (categories[key] && categories[key].length > 0) {
                embed.addFields({
                    name: `${info.emoji} ${info.name}`,
                    value: `${categories[key].length} commands`,
                    inline: true
                });
            }
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_category')
            .setPlaceholder('Select a category...')
            .addOptions(
                Object.entries(categoryInfo)
                    .filter(([key]) => categories[key]?.length > 0)
                    .map(([key, info]) => ({
                        label: info.name,
                        description: info.description,
                        value: key,
                        emoji: info.emoji
                    }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const buttonRow = new ActionRowBuilder()
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
                    .setEmoji('🌐'),
                new ButtonBuilder()
                    .setLabel('Invite Bot')
                    .setURL(`https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`)
                    .setStyle(ButtonStyle.Link)
                    .setEmoji('➕')
            );

        const response = await interaction.reply({
            embeds: [embed],
            components: [row, buttonRow],
            fetchReply: true
        });

        const collector = response.createMessageComponentCollector({
            time: 300000 // 5 minutes
        });

        collector.on('collect', async (i) => {
            if (i.customId !== 'help_category') return;
            
            if (i.user.id !== interaction.user.id) {
                return i.reply({
                    content: 'Use `/help` to get your own help menu.',
                    ephemeral: true
                });
            }

            const category = i.values[0];
            const info = categoryInfo[category];
            const commands = categories[category] || [];

            const categoryEmbed = new EmbedBuilder()
                .setColor(Colors.primary)
                .setAuthor({ 
                    name: `${info.emoji} ${info.name} Commands`, 
                    iconURL: client.user.displayAvatarURL() 
                })
                .setDescription(commands.map(cmd => {
                    const description = cmd.data.description?.substring(0, 50) || 'No description';
                    return `\`/${cmd.data.name}\` - ${description}`;
                }).join('\n'))
                .setFooter({ text: `${commands.length} commands • /help <command> for details` });

            await i.update({ embeds: [categoryEmbed] });
        });

        collector.on('end', async () => {
            try {
                await response.edit({ components: [buttonRow] });
            } catch (e) {}
        });
    },

    async autocomplete(client, interaction) {
        const focused = interaction.options.getFocused();
        const commands = [...client.commands.values()];

        const filtered = commands
            .filter(cmd => cmd.data.name.includes(focused.toLowerCase()))
            .slice(0, 25)
            .map(cmd => ({
                name: `/${cmd.data.name} - ${cmd.data.description?.substring(0, 50) || ''}`,
                value: cmd.data.name
            }));

        await interaction.respond(filtered);
    }
};

async function showCommandDetails(client, interaction, commandName) {
    const command = client.commands.get(commandName.toLowerCase());

    if (!command) {
        const embed = new EmbedBuilder()
            .setColor(Colors.error)
            .setDescription(`❌ Command \`${commandName}\` not found.`);

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const embed = new EmbedBuilder()
        .setColor(Colors.primary)
        .setTitle(`📖 /${command.data.name}`)
        .setDescription(command.data.description || 'No description available.');

    if (command.data.options?.length > 0) {
        const options = command.data.options.map(opt => {
            const required = opt.required ? ' `(required)`' : ' `(optional)`';
            return `• **${opt.name}**${required}\n  ${opt.description || ''}`;
        }).join('\n');

        embed.addFields({ name: 'Options', value: options });
    }

    if (command.aliases?.length > 0) {
        embed.addFields({
            name: 'Aliases',
            value: command.aliases.map(a => `\`${a}\``).join(', '),
            inline: true
        });
    }

    if (command.cooldown) {
        embed.addFields({
            name: 'Cooldown',
            value: `${command.cooldown}s`,
            inline: true
        });
    }

    if (command.category) {
        embed.addFields({
            name: 'Category',
            value: command.category,
            inline: true
        });
    }

    await interaction.reply({ embeds: [embed] });
}
