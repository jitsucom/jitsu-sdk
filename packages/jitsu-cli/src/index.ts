import chalk from 'chalk';
import commands from "./commands/commands";
import {Command} from "./commands/command";

function isHelpOption(arg: string) {
    return arg === '-help' || arg === '--help' || arg === 'help' || arg === '-?' || arg === '--?';
}

function displayHelp(cmd?: string) {
    if (!cmd) {
        console.error("")
        console.error("Run a CLI interface of " + chalk.bold("Jitsu") + " (👉 https://jitsu.com)");
        console.error("")
        console.error("Usage (available commands):");
        console.error("")
        console.error(Object.keys(commands).map(cmd => {
            return `  jitsu ${cmd} <options>`
        }).join("\n"))
        console.error("")
        console.error(`To get help run ${chalk.bold('jitsu <command> help')}`)
        console.error("")
        process.exit(0)
    } else {
        console.error("")
        // @ts-ignore
        let command: Command = commands[cmd];
        if (!command) {
            console.error(chalk.bold.red('Error!') + " Command " + chalk.bold(cmd) + " not found!")
            process.exit(1)
        } else {
            console.error('  ' + chalk.bold(`jitsu ${cmd}`) + " " + command.description)
            if (command.help) {
                console.error("")
                console.error(command.help)
            }
            console.error("")
        }
    }
}



export function index(): Promise<any> {
    const args = [...process.argv.slice(2)];
    if (args.length === 0 || (isHelpOption(args[0]) && args.length == 1)) {
        displayHelp();
    } else if (args.length == 2 && isHelpOption(args[0])) {
        displayHelp(args[1])
    } else if (args.length == 2 && isHelpOption(args[1])) {
        displayHelp(args[0])
    } else {
        // @ts-ignore
        let command: Command = commands[args[1]];
        if (!command) {
            console.error(chalk.bold.red('Error!') + " Command " + chalk.bold(args[1]) + " not found!")
            process.exit(1)
        }


    }
    return Promise.resolve();
}

index();