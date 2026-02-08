import { EmbedBuilder } from 'discord.js';

export class ErrorHandler {
    constructor(client) {
        this.client = client;
    }

    /**
     * Handle command execution errors
     */
    async handleCommandError(error, interaction, commandName) {
        const errorId = this.#generateErrorId();
        
        this.client.logger.error(`Command Error [${errorId}] in ${commandName}:`, error);

        const { title, description } = this.#categorizeError(error);

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(`❌ ${title}`)
            .setDescription(description)
            .addFields({
                name: '📋 Error ID',
                value: `\`${errorId}\``,
                inline: true
            })
            .setFooter({ text: 'If this persists, please report this error' })
            .setTimestamp();

        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ embeds: [embed], components: [] });
            } else {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (e) {
            this.client.logger.error('Failed to send error message:', e);
        }

        return errorId;
    }

    /**
     * Handle player errors
     */
    async handlePlayerError(error, player, track) {
        const errorId = this.#generateErrorId();
        const guildId = player.guildId;
        
        this.client.logger.error(`Player Error [${errorId}] in guild ${guildId}:`, error);

        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) return;

        const textChannel = player.textId 
            ? guild.channels.cache.get(player.textId) 
            : null;

        if (!textChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0xFF6B6B)
            .setTitle('⚠️ Playback Error')
            .setDescription(
                track 
                    ? `Failed to play: **${track.title}**\n\nSkipping to next track...`
                    : 'An error occurred during playback.'
            )
            .setFooter({ text: `Error ID: ${errorId}` })
            .setTimestamp();

        try {
            await textChannel.send({ embeds: [embed] });
        } catch (e) {
        }

        return errorId;
    }

    /**
     * Handle voice connection errors
     */
    async handleVoiceError(error, guildId) {
        const errorId = this.#generateErrorId();
        this.client.logger.error(`Voice Error [${errorId}] in guild ${guildId}:`, error);
        return errorId;
    }

    /**
     * Handle database errors
     */
    handleDatabaseError(error, operation) {
        const errorId = this.#generateErrorId();
        this.client.logger.error(`Database Error [${errorId}] during ${operation}:`, error);
        return errorId;
    }

    /**
     * Wrap async function with error handling
     */
    wrap(fn, context = 'Unknown') {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.client.logger.error(`Error in ${context}:`, error);
                throw error;
            }
        };
    }

    /**
     * Categorize error for user-friendly message
     */
    #categorizeError(error) {
        const message = error.message?.toLowerCase() || '';
        const code = error.code;

        if (code === 50013) {
            return {
                title: 'Missing Permissions',
                description: 'I don\'t have the required permissions to perform this action.'
            };
        }
        
        if (code === 10008) {
            return {
                title: 'Message Not Found',
                description: 'The message was deleted or is no longer accessible.'
            };
        }

        if (code === 10062) {
            return {
                title: 'Interaction Expired',
                description: 'This interaction has expired. Please try again.'
            };
        }

        if (message.includes('no player') || message.includes('no active player')) {
            return {
                title: 'No Active Player',
                description: 'There is no music currently playing.'
            };
        }

        if (message.includes('not in voice') || message.includes('voice channel')) {
            return {
                title: 'Voice Channel Required',
                description: 'You need to be in a voice channel to use this command.'
            };
        }

        if (message.includes('queue is empty') || message.includes('empty queue')) {
            return {
                title: 'Empty Queue',
                description: 'There are no songs in the queue.'
            };
        }

        if (message.includes('no results') || message.includes('not found')) {
            return {
                title: 'No Results Found',
                description: 'Could not find any results for your search.'
            };
        }

        if (message.includes('age restricted') || message.includes('age-restricted')) {
            return {
                title: 'Age Restricted Content',
                description: 'This content is age-restricted and cannot be played.'
            };
        }

        if (message.includes('unavailable') || message.includes('private')) {
            return {
                title: 'Content Unavailable',
                description: 'This content is private or unavailable in your region.'
            };
        }

        if (message.includes('lavalink') || message.includes('node')) {
            return {
                title: 'Audio Server Error',
                description: 'The audio server is currently unavailable. Please try again later.'
            };
        }

        if (message.includes('rate limit') || code === 429) {
            return {
                title: 'Rate Limited',
                description: 'Too many requests. Please wait a moment before trying again.'
            };
        }

        if (message.includes('timeout') || message.includes('timed out')) {
            return {
                title: 'Request Timeout',
                description: 'The operation took too long. Please try again.'
            };
        }

        return {
            title: 'Something Went Wrong',
            description: 'An unexpected error occurred. Please try again later.'
        };
    }

    /**
     * Generate unique error ID
     */
    #generateErrorId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 6);
        return `${timestamp}-${random}`.toUpperCase();
    }
}

export default ErrorHandler;
