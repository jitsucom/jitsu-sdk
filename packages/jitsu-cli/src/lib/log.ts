import chalk from "chalk"

export type Log = {
  info: (msg?: string, ...args: any[]) => void
  spinInfo: (...args: string[]) => void
  error: (...args: string[]) => void
}

export default function getLog(): Log {
  return {
    error(args: string): void {},
    spinInfo(args: string): void {},
    info(msg?: string, ...args: any[]): void {
      if (!msg) {
        console.error("")
        return
      }
      let consoleMsg = chalk.cyan("[info  ]") + " - " + msg
      if (args.length > 0) {
        console.info(consoleMsg, args)
      } else {
        console.error(consoleMsg)
      }
    },
  }
}
