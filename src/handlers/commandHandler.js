import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export class CommandHandler {
    constructor(client) {
        this.client = client;
        this.commandsPath = join(__dirname, '../commands');
    }

    async load() {
        const categories = readdirSync(this.commandsPath);

        for (const category of categories) {
            const categoryPath = join(this.commandsPath, category);
            const files = readdirSync(categoryPath).filter(f => f.endsWith('.js'));

            for (const file of files) {
                try {
                    const filePath = join(categoryPath, file);
                    const command = await import(`file://${filePath}`);
                    const cmd = command.default;

                    if (!cmd?.data?.name) {
                        this.client.logger.warn(`Skipping ${file}: missing data.name`);
                        continue;
                    }

                    cmd.category = category;
                    cmd.filePath = filePath;

                    this.client.commands.set(cmd.data.name, cmd);

                    if (cmd.aliases) {
                        for (const alias of cmd.aliases) {
                            this.client.aliases.set(alias, cmd.data.name);
                        }
                    }

                } catch (error) {
                    this.client.logger.error(`Failed to load ${file}:`, error);
                }
            }
        }
    }

    async reload(commandName) {
        const command = this.client.commands.get(commandName) 
            || this.client.commands.get(this.client.aliases.get(commandName));

        if (!command) return false;

        try {
            delete require.cache[require.resolve(command.filePath)];
            
            const newCommand = await import(`file://${command.filePath}?update=${Date.now()}`);
            const cmd = newCommand.default;
            
            cmd.category = command.category;
            cmd.filePath = command.filePath;
            
            this.client.commands.set(cmd.data.name, cmd);
            
            return true;
        } catch (error) {
            this.client.logger.error(`Failed to reload ${commandName}:`, error);
            return false;
        }
    }
}

export default CommandHandler;
