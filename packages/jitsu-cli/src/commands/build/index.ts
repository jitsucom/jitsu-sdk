import {Command, CommandResult} from "../command";

const buildCommand: Command = {
    description: "builds a Jitsu destination project",
    help: "",
    exec(args: string[]): Promise<CommandResult> {
        return Promise.resolve({success: true });
    }
}

export default buildCommand;