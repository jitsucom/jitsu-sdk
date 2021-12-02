import chalk from "chalk"

import { CommandRegistry } from "./lib/command/types"
import { executeCommand, subcommands } from "./lib/command"
import { destinationCommands, help } from "./cli/destination"
import * as Process from "process"
import getLog from "./lib/log"
import { jitsuCliVersion } from "./lib/version"

const commands: CommandRegistry<'destination'> = {
  destination: subcommands(destinationCommands, {
    description: "A set of commands for building Jitsu destination",
    binPrefix: "jitsu destination",
    customHelp: help
  }),
}



function exitWithError(error: string, details?: string) {
  console.error(`${chalk.bold.red("Error!")} - ${error}`)
  if (details) {
    console.error(details)
  }
  return 1;
}

export async function run(args: string[]): Promise<number> {
  let result = await executeCommand(commands, args, {
    description: "CLI interface of " + chalk.bold("Jitsu") + `(👉 https://jitsu.com), version ${jitsuCliVersion}`,
    binPrefix: "jitsu",
  })
  if (result.success) {
    getLog().info("✨ Done")
    return 0
  } else {
    return exitWithError(result.message, result.details)
  }
}
