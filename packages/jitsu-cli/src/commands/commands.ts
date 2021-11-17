import {CommandName, Command} from "./command";
import buildCommand from "./build";

const commands: Record<CommandName, Command> = {
    "dst-build": buildCommand,
}

export default commands;