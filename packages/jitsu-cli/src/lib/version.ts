import pkg from "../../package.json"
import chalk from "chalk"
import getLog from "./log"
import semver from "semver/preload"
const fetch = require("cross-fetch");

export const jitsuCliVersion = pkg.version
export const jitsuPackageName = pkg.name
let newVersion = undefined;

export function getUpgradeMessage(newVersion: string) {
  return box(`🚀 New version of Jitsu CLI is available: ${newVersion}.\n   Run ${chalk.bold(
    "npm install -g " + jitsuPackageName
  )} or ${chalk.bold("yarn global install " + jitsuPackageName)}`)
}
function padRight(str: string, minLen: number, symbol: string = " ") {
  return str.length >= minLen ? str : str + symbol.repeat(minLen - str.length)
}
export function box(msg: string) {
  let lines = msg.split("\n")
  return [
    '──'.repeat(80),
      ...lines.map(ln => ` ${ln}`),
    '──'.repeat(80),
    ].join("\n")

}

export async function hasNewerVersion(): Promise<string | undefined> {
  try {
    let json = (await (await fetch(`https://registry.npmjs.org/-/package/${jitsuPackageName}/dist-tags`)).json()) as any
    let latestVersion = json.latest
    return semver.gt(latestVersion, jitsuCliVersion) ? latestVersion : undefined
  } catch (e: any) {
    getLog().debug(`Failed to fetch latest version of ${jitsuPackageName}: ${e?.message}`)
  }
}
