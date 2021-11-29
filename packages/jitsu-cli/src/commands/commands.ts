import { CommandName, Command } from "./command"
import destinationCommand from "./destination"

const commands: Record<CommandName, Command> = {
  destination: destinationCommand,
}

export default commands
