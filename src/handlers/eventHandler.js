import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class EventHandler {
    constructor(client) {
        this.client = client;
        this.eventsPath = join(__dirname, '../events');
    }

    async load() {
        const eventFiles = readdirSync(this.eventsPath)
            .filter(file => file.endsWith('.js'));

        for (const file of eventFiles) {
            try {
                const filePath = join(this.eventsPath, file);
                const event = await import(`file://${filePath}`);
                const eventModule = event.default;

                if (!eventModule?.name) {
                    this.client.logger.warn(`Skipping ${file}: missing event name`);
                    continue;
                }

                if (eventModule.once) {
                    this.client.once(eventModule.name, (...args) => 
                        eventModule.execute(this.client, ...args)
                    );
                } else {
                    this.client.on(eventModule.name, (...args) => 
                        eventModule.execute(this.client, ...args)
                    );
                }

                this.client.logger.debug(`Loaded event: ${eventModule.name}`);

            } catch (error) {
                this.client.logger.error(`Failed to load event ${file}:`, error);
            }
        }
    }
}

export default EventHandler;
