import pkg from "../../package.json"
import chalk from "chalk"
import getLog from "./log"
import semver from "semver/preload"
const fetch = require("cross-fetch");

export const jitsuCliVersion = pkg.version
export const jitsuPackageName = pkg.name
let newVersion = undefined;

export function getUpgradeMessage(newVersion: string) {
  return `New version of jitsu is available: ${newVersion}. Run ${chalk.bold(
    "npm install -g " + jitsuPackageName
  )} or ${chalk.bold("npm upgrade -g yarn global upgrade " + jitsuPackageName)} `
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
