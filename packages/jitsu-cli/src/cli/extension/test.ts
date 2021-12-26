import { CommandResult } from "../../lib/command/types";
import path from "path";
import getLog from "../../lib/log";
import chalk from "chalk";
import fs from "fs";
import { run as jest } from "jest-cli";
import { validateTsConfig } from "./";

export async function test(args: string[]): Promise<CommandResult> {
  const directory = args?.[0] || "";
  let projectBase = path.isAbsolute(directory) ? directory : path.resolve(process.cwd() + "/" + directory);
  getLog().info("🛂 Running tests for " + chalk.bold(projectBase));
  let tsConfigPath = path.resolve(projectBase, "tsconfig.json");
  const typescriptEnabled = fs.existsSync(tsConfigPath);
  if (typescriptEnabled) {
    getLog().info(`ℹ️ Found ${chalk.bold("tsconfig.json")}, typescript will be enabled`);
  } else {
    return {
      success: false,
      message: `${chalk.bold(
        "tsconfig.json"
      )} is not found in the root of the project. Pure JS extensions are not supported yet`,
    };
  }
  validateTsConfig(tsConfigPath);
  let jestArgs = ["--passWithNoTests", "--projects", projectBase];
  if (typescriptEnabled) {
    jestArgs.push("--preset", "ts-jest");
  }
  await jest(jestArgs);

  return { success: true };
}
