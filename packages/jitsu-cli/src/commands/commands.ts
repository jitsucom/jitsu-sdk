import {CommandName, Command} from "./command";
import buildCommand from "./build";

const commands: Record<CommandName, Command> = {
    "destination build": buildCommand,
}

export default commands;