import chalk from "chalk"
import commands from "./commands/commands"
import { Command, CommandResult } from "./commands/command"
import getLog from "./lib/log"

function isHelpOption(arg: string) {
  return arg === "-help" || arg === "--help" || arg === "help" || arg === "-?" || arg === "--?"
}

function displayHelp(cmd?: string) {
  if (!cmd) {
    console.error("")
    console.error("Run a CLI interface of " + chalk.bold("Jitsu") + " (👉 https://jitsu.com)")
    console.error("")
    console.error("Usage (available commands):")
    console.error("")
    console.error(
      Object.keys(commands)
        .map(cmd => {
          return `  jitsu ${cmd} <options>`
        })
        .join("\n")
    )
    console.error("")
    console.error(`To get help run ${chalk.bold("jitsu <command> help")}`)
    console.error("")
    process.exit(0)
  } else {
    console.error("")
    // @ts-ignore
    let command: Command = commands[cmd]
    if (!command) {
      console.error(chalk.bold.red("Error!") + " Command " + chalk.bold(cmd) + " not found!")
      process.exit(1)
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
            .join("\n")
        )
      }
      console.error("")
    }
  }
}

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

function exitWithError(error: string, details?: string) {
  console.error(`${chalk.bold.red("Error!")} - ${error}`)
  if (details) {
    console.error(details)
  }
  process.exit(1)
}

export async function index(): Promise<any> {
  const args = [...process.argv.slice(2)]
  if (args.length === 0 || (isHelpOption(args[0]) && args.length == 1)) {
    displayHelp()
    process.exit(0)
    return
  }

  for (const [commandName, cmd] of Object.entries(commands)) {
    let commandArgs = captureCommand(commandName, args)
    if (commandArgs) {
      if (commandArgs.length > 0 && isHelpOption(commandArgs[0])) {
        displayHelp(commandName)
        process.exit(0)
        return
      } else {
        let commandResult: CommandResult
        try {
          commandResult = await cmd.exec(commandArgs)
        } catch (e: any) {
          exitWithError(e?.message || "unknown error")
          return
        }
        if (commandResult.success) {
          process.on("exit", () => {
            if (!process.exitCode) {
              getLog().info("Completed!")
              process.exit(0)
            }
          })
          return
        } else {
          exitWithError(commandResult.message || "unknown error", commandResult.details)
        }
      }
    }
  }

  let error = ` unknown command ${chalk.bold(args.join(" "))}. Run ${chalk.bold("jitsu help")} to see available options`
  exitWithError(error)
  return
}

index()
