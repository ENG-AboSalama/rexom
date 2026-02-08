import { ActivityType } from 'discord.js';

export default {
    name: 'clientReady',
    once: true,

    async execute(client) {
        client.logger.divider();
        client.logger.success(`Logged in as ${client.user.tag}`);
        client.logger.info(`Serving ${client.guilds.cache.size} guilds`);
        client.logger.info(`${client.commands.size} commands loaded`);
        client.logger.divider();

        const activities = [
            { name: '/play', type: ActivityType.Listening },
            { name: `${client.guilds.cache.size} servers`, type: ActivityType.Watching },
            { name: 'rexom.dev', type: ActivityType.Playing },
        ];

        let currentActivity = 0;

        const updateActivity = () => {
            client.user.setPresence({
                activities: [activities[currentActivity]],
                status: 'online'
            });
            currentActivity = (currentActivity + 1) % activities.length;
        };

        updateActivity();
        setInterval(updateActivity, 30000);

        try {
            client.logger.info('Deploying commands...');
            
            const commands = [...client.commands.values()]
                .filter(cmd => cmd.data)
                .map(cmd => cmd.data.toJSON());

            await client.application.commands.set(commands);

            client.logger.success(`✅ Deployed ${commands.length} commands globally`);
        } catch (error) {
            client.logger.error('Failed to deploy commands:', error);
        }
    }
};
