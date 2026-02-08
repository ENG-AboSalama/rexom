import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class Logger {
    constructor(options = {}) {
        this.logToFile = options.logToFile ?? process.env.NODE_ENV === 'production';
        this.logDir = options.logDir || path.join(__dirname, '../../logs');
        this.debugMode = process.env.DEBUG === 'true';
        
        if (this.logToFile) {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
            }
        }
    }

    #timestamp() {
        return new Date().toISOString();
    }

    #formatMessage(level, message, ...args) {
        const timestamp = this.#timestamp();
        const formattedArgs = args.map(arg => 
            arg instanceof Error ? arg.stack : 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
        ).join(' ');
        
        return `[${timestamp}] [${level}] ${message} ${formattedArgs}`.trim();
    }

    #writeToFile(level, message) {
        if (!this.logToFile) return;
        
        const date = new Date().toISOString().split('T')[0];
        const logFile = path.join(this.logDir, `${date}.log`);
        
        fs.appendFileSync(logFile, message + '\n');
    }

    divider() {
        console.log(chalk.gray('─'.repeat(75)));
    }

    info(message, ...args) {
        const formatted = this.#formatMessage('INFO', message, ...args);
        console.log(chalk.blue('ℹ'), chalk.white(message), ...args.map(a => chalk.gray(a)));
        this.#writeToFile('INFO', formatted);
    }

    success(message, ...args) {
        const formatted = this.#formatMessage('SUCCESS', message, ...args);
        console.log(chalk.green('✓'), chalk.green(message), ...args);
        this.#writeToFile('SUCCESS', formatted);
    }

    warn(message, ...args) {
        const formatted = this.#formatMessage('WARN', message, ...args);
        console.log(chalk.yellow('⚠'), chalk.yellow(message), ...args);
        this.#writeToFile('WARN', formatted);
    }

    error(message, ...args) {
        const formatted = this.#formatMessage('ERROR', message, ...args);
        console.error(chalk.red('✖'), chalk.red(message), ...args);
        this.#writeToFile('ERROR', formatted);
    }

    debug(message, ...args) {
        if (!this.debugMode) return;
        const formatted = this.#formatMessage('DEBUG', message, ...args);
        console.log(chalk.magenta('🔍'), chalk.magenta(message), ...args);
        this.#writeToFile('DEBUG', formatted);
    }

    command(commandName, user, guild) {
        const msg = `Command: ${commandName} | User: ${user} | Guild: ${guild}`;
        console.log(chalk.cyan('⌘'), chalk.cyan(msg));
        this.#writeToFile('COMMAND', this.#formatMessage('COMMAND', msg));
    }

    player(action, guild, details = '') {
        const msg = `Player: ${action} | Guild: ${guild} ${details ? `| ${details}` : ''}`;
        console.log(chalk.hex('#e94560')('♪'), chalk.hex('#e94560')(msg));
        this.#writeToFile('PLAYER', this.#formatMessage('PLAYER', msg));
    }
}

export default new Logger();
