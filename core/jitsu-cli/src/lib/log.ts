import chalk from "chalk";

export type Log = {
  debug: (msg?: string, ...args: any[]) => void;
  info: (msg?: string, ...args: any[]) => void;
  spinInfo: (...args: string[]) => void;
  error: (...args: string[]) => void;
};

function log(
  delegate,
  styling: { prefix: string; color: string; bgColor?: string },
  msg: string | undefined,
  args: any[]
) {
  if (!msg) {
    delegate("");
    return;
  }
  let consoleMsg = chalk[styling.color](`[${styling.prefix}]`) + " - " + msg;
  if (args.length > 0) {
    delegate(consoleMsg, args);
  } else {
    delegate(consoleMsg);
  }
}

export default function getLog(): Log {
  return {
    error(msg?: string, ...args: any[]): void {
      log(console.error, { prefix: "error", color: "red" }, msg, args);
    },
    spinInfo(args: string): void {},
    info(msg?: string, ...args: any[]): void {
      log(console.info, { prefix: "info ", color: "cyan" }, msg, args);
    },
    debug(msg?: string, ...args: any[]): void {
      log(console.debug, { prefix: "debug", color: "gray" }, msg, args);
    },
  };
}
