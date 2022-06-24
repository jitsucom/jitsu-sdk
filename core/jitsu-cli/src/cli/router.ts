import minimist from "minimist";
import { CommandResult } from "../lib/command/types";
import { Partial } from "rollup-plugin-typescript2/dist/partial";
import chalk from "chalk";
import { align } from "../lib/indent";

export const binName = "jitsu-cli";

export type CommandRunner = (args: minimist.ParsedArgs) => Promise<CommandResult>;
type ArgsNames = [string] | [string, string];
export type CommandArgument = {
  name: ArgsNames;
  required?: boolean;
  value?: string;
  description?: string;
};
export type Command = {
  run: CommandRunner;
  showHelpOnNoArgs?: boolean;
  description: string;
  args?: CommandArgument[];
  aliases?: string[] | string;
};

export type RouterConfig = {
  $commandGroupDescription?: string | undefined;
  [key: string]: RouterConfig | Command | string | undefined;
};

function asCommand(currentConfig?: RouterConfig | Command | string): Command | undefined {
  if (currentConfig && typeof currentConfig !== "string" && currentConfig.run && currentConfig.description) {
    return currentConfig as Command;
  } else {
    return undefined;
  }
}

function firstLetterToLower(sentense: string) {
  return sentense.charAt(0).toLowerCase() + sentense.substring(1);
}

function withHelp(cmd: Command, cmdName: string[]): CommandRunner {
  return (args: minimist.ParsedArgs) => {
    if (
      ((args._.length > 0 && args._[args._.length - 1] === "help") ||
        args.help ||
        args["?"] ||
        (cmd.showHelpOnNoArgs && Object.keys(args).length == 1)) &&
      cmdName[cmdName.length - 1] !== "help"
    ) {
      console.log(`${chalk.bold("USAGE")}`);
      console.log(`   ${[binName, ...cmdName].join(" ")}${args ? " [OPTIONS]" : ""}`);
      console.log();
      console.log(`${chalk.bold("SYNOPSYS")}`);
      console.log(align(cmd.description, { indent: 3 }));
      console.log();
      if (args) {
        console.log(`${chalk.bold("OPTIONS")}`);
        for (const arg of cmd.args || []) {
          console.log(
            `    ${chalk.bold(toString(arg.name))}${arg.value ? "=" + arg.value.toUpperCase() : ""}, ${
              arg.required ? "required" : chalk.gray("optional")
            }`
          );
          if (arg.description) {
            console.log(align(arg.description, { indent: 9 }));
          }
          console.log();
        }
        console.log();
      }

      return Promise.resolve({ success: true });
    } else {
      return cmd.run(args);
    }
  };
}

function hydrate(currentConfig: RouterConfig, parentCommands: string[] = []): RouterConfig {
  const hydrated: RouterConfig = {};
  const allCommands: { name: string; description: string; args?: CommandArgument[] }[] = [];
  for (const [name, commandOrConfig] of Object.entries(currentConfig)) {
    const command = asCommand(commandOrConfig);
    if (command) {
      hydrated[name] = command;
      allCommands.push({ name, description: command.description, args: command.args });
      if (command.aliases) {
        (typeof command.aliases === "string" ? [command.aliases] : command.aliases).forEach(alias => {
          hydrated[alias] = command;
        });
      }
    } else if (typeof commandOrConfig !== "string") {
      allCommands.push({
        name,
        description: `Run \`${[binName, ...parentCommands, name, "help"].join(" ")}\` for details`,
      });
      hydrated[name] = hydrate(commandOrConfig as RouterConfig, [...parentCommands, name]);
    }
  }
  hydrated["help"] = {
    run: async () => {
      console.log(`${chalk.bold("USAGE")}`);
      console.log(`   ${binName} ${parentCommands.join(" ")} [COMMAND] [ARGUMENTS]`);
      console.log();
      const longestName =
        allCommands.reduce((max, { name }) => Math.max(max, [binName, ...parentCommands, name].join(" ").length), 0) +
        5;
      if (allCommands.length > 0) {
        console.log(`${chalk.bold("AVAILABLE COMMANDS")}`);
      }
      allCommands.forEach(({ name, description, args }) => {
        console.log(
          `   ${chalk.bold([binName, ...parentCommands, name].join(" ").padEnd(longestName))}  ${firstLetterToLower(
            description
          )}`
        );
      });
      console.log();
      console.log(`Run \`${chalk.bold(`${binName} [COMMAND] help`)}\` for more details`);
      console.log();

      return { success: true };
    },
    description: "Show help",
  };
  return hydrated;
}

function toString(argName: ArgsNames) {
  if (argName.length == 1) {
    return `--${argName[0]}`;
  } else {
    return `-${argName[1]},--${argName[0]}`;
  }
}

export async function route(config: RouterConfig, _args: any[]): Promise<CommandResult> {
  const args = minimist(_args);
  const commands = [...args._];
  if (commands.length === 0) {
    return { success: false, message: "No command specified" };
  }
  let currentConfig: RouterConfig | Command = hydrate(config);
  const currentCommand: string[] = [];
  while (commands.length > 0) {
    const commandName = commands.shift() as string;
    const parentConfig = currentConfig;
    currentConfig = currentConfig[commandName];
    currentCommand.push(commandName);
    if (currentConfig === undefined) {
      return { success: false, message: `Command ${chalk.bold(currentCommand.join(" "))} not found` };
    }
    const commandRunner = asCommand(currentConfig);
    if (commandRunner) {
      try {
        return await withHelp(commandRunner, currentCommand)(args);
      } catch (e: any) {
        return { success: false, message: e?.message || "Uknown error", details: args.verbose ? e.stack : undefined };
      }
    } else if (commands.length === 0 && parentConfig["help"] && asCommand(currentConfig["help"])) {
      return ((await asCommand(currentConfig["help"])) as Command).run(args);
    }
  }
  return { success: false, message: "" || "Unknown command" };
}
