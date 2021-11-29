import { Command,  CommandRegistry, CommandResult, HelpOptions } from "./types"
import getLog from "../log"
import chalk from "chalk"

function captureCommand(command: string, args: string[]): string[] | undefined {
  let commandParts = command.split(" ")
  if (commandParts.length > args.length) {
    return undefined
  }
  for (let i = 0; i < commandParts.length; i++) {
    if (commandParts[i] !== args[i]) {
      return undefined
    }
  }
  return args.slice(commandParts.length)
}

function isHelpOption(arg: string) {
  return arg === "-help" || arg === "--help" || arg === "help" || arg === "-?" || arg === "--?"
}

function displayHelp(commands: CommandRegistry, helpOpts: { binPrefix: string; description: string, customHelp?: string }, cmd?: string) {
  if (helpOpts.customHelp) {
    console.error(helpOpts.customHelp);
    return;
  }
  if (!cmd) {
    console.error("")
    console.error(chalk.bold(`${helpOpts.binPrefix} <command> ...args — `) + `${helpOpts.description}`)
    console.error("")
    console.error("Available commands: ")
    console.error("")
    console.error(
      Object.keys(commands)
        .map(cmd => {
          return `  ${helpOpts.binPrefix} ${cmd} <options>`
        })
        .join("\n"),
    )
    console.error("")
    console.error(`To get help run ${chalk.bold(helpOpts.binPrefix + " <command> help")}:`)
    console.error("")
    console.error(
      Object.keys(commands)
        .map(cmd => {
          return `  ${helpOpts.binPrefix} ${cmd} help`
        })
        .join("\n"),
    )
    console.error("")
  } else {
    console.error("")
    // @ts-ignore
    let command: Command = commands[cmd]
    if (!command) {
      console.error(chalk.bold.red("Error!") + " Command " + chalk.bold(cmd) + " not found!")
    } else {
      console.error(chalk.bold(`SYNOPSIS`))
      console.error("")
      console.error(chalk.bold(`  jitsu ${cmd}`) + " - " + command.description)
      if (command.help) {
        console.error("")
        console.error(
          command.help
            .trim()
            .split("\n")
            .map(ln => `${ln}`)
            .join("\n"),
        )
      }
      console.error("")
    }
  }
}

export const executeCommand = async (commands: CommandRegistry, args: string[], helpOpts: HelpOptions): Promise<CommandResult> => {
  if (args.length === 0 || isHelpOption(args[0])) {
    displayHelp(commands, helpOpts)
    return { success: true }
  }
  for (const [commandName, cmd] of Object.entries(commands)) {
    let commandArgs = captureCommand(commandName, [...args])
    if (commandArgs) {
      if (commandArgs.length > 0 && isHelpOption(commandArgs[0])) {
        displayHelp(commands, helpOpts, commandName)
        return { success: true }
      } else {
        try {
          return await cmd.exec(commandArgs)
        } catch (e: any) {
          return { success: false, message: e?.message || "unknown error", details: e?.stack }
        }
      }
    }
  }
  let error = `unknown command '${chalk.bold(args.join(" "))}'. Run ${chalk.bold(helpOpts.binPrefix + " help")} to see available options`
  return { success: false, message: error }
}

export function subcommands(commands: CommandRegistry, helpOpts: HelpOptions): Command {
  return {
    description: helpOpts.description,
    exec(args: string[]): Promise<CommandResult> {
      return executeCommand(commands, args, helpOpts)
    },
    help: helpOpts.customHelp || `Run ${helpOpts.binPrefix} help to see all available options`,
  }
}