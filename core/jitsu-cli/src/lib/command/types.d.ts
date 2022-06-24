type CommandSucceeded = {
  success: true;
};

type CommandFailed = { success: false; message: string; details?: string };

export type CommandResult = CommandSucceeded | CommandFailed;

export type Command = {
  exec: (args: string[]) => Promise<CommandResult>;
  description: string;
  help: string;
  aliases?: string[];
};

export type CommandRegistry<C extends string = string> = Record<C, Command>;

export type HelpOptions = { description: string; binPrefix: string; customHelp?: string };
