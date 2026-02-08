import { readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class ComponentHandler {
    constructor(client) {
        this.client = client;
        this.componentsPath = join(__dirname, '../components');
    }

    async load() {
        if (!existsSync(this.componentsPath)) {
            return;
        }

        await this.#loadComponents('buttons', this.client.buttons);
        
        await this.#loadComponents('selectMenus', this.client.selectMenus);
        
        await this.#loadComponents('modals', this.client.modals);
    }

    async #loadComponents(type, collection) {
        const typePath = join(this.componentsPath, type);
        
        if (!existsSync(typePath)) {
            return;
        }

        const files = readdirSync(typePath).filter(f => f.endsWith('.js'));

        for (const file of files) {
            try {
                const filePath = join(typePath, file);
                const component = await import(`file://${filePath}`);
                const comp = component.default;

                if (!comp?.customId) {
                    this.client.logger.warn(`Skipping ${file}: missing customId`);
                    continue;
                }

                collection.set(comp.customId, comp);
                this.client.logger.debug(`Loaded ${type}: ${comp.customId}`);

            } catch (error) {
                this.client.logger.error(`Failed to load ${type}/${file}:`, error);
            }
        }
    }
}

export default ComponentHandler;
