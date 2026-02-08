import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const commands = [];
const commandsPath = join(__dirname, 'src', 'commands');

const categories = readdirSync(commandsPath);

for (const category of categories) {
    const categoryPath = join(commandsPath, category);
    const commandFiles = readdirSync(categoryPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = join(categoryPath, file);
        const command = (await import(`file://${filePath}`)).default;
        
        if (command?.data) {
            commands.push(command.data.toJSON());
            console.log(`✓ Loaded: ${command.data.name}`);
        }
    }
}

console.log(`\nLoaded ${commands.length} commands\n`);

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

async function deploy() {
    try {
        console.log('🔄 Deploying commands...\n');

        if (process.argv.includes('--guild')) {
            const guildId = process.env.DEV_GUILD_ID;
            
            if (!guildId) {
                console.error('❌ DEV_GUILD_ID not set in .env');
                process.exit(1);
            }

            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
                { body: commands }
            );

            console.log(`✅ Deployed ${commands.length} commands to guild ${guildId}`);
        } else {
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands }
            );

            console.log(`✅ Deployed ${commands.length} commands globally`);
            console.log('⚠️  Global commands may take up to 1 hour to update');
        }
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    }
}

async function clear() {
    try {
        console.log('🗑️ Clearing commands...\n');

        if (process.argv.includes('--guild')) {
            const guildId = process.env.DEV_GUILD_ID;
            
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
                { body: [] }
            );

            console.log(`✅ Cleared guild commands`);
        } else {
            await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: [] }
            );

            console.log(`✅ Cleared global commands`);
        }
    } catch (error) {
        console.error('❌ Failed to clear:', error);
    }
}

if (process.argv.includes('--clear')) {
    clear();
} else {
    deploy();
}
