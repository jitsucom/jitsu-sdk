import { CommandResult } from "../../lib/command/types";
import chalk from "chalk";
import path from "path";
import fs from "fs";
import JSON5 from "json5";
import getLog from "../../lib/log";
import { getDistFile, loadBuild, getConfigJson } from "./index";
import { validateConfiguration } from "../../lib/validation";
import minimist from "minimist";
import { binName } from "../router";

export async function validateConfig(args: minimist.ParsedArgs): Promise<CommandResult> {
  const config = args.config || args.c;
  const dir = args.dir || args.d || "";

  if (!config) {
    return {
      success: false,
      message: "Please define config object -c json_file_path or -c '{json_object:}'",
    };
  }
  let configObj: any;
  try {
    configObj = getConfigJson(config);
  } catch (e: any) {
    return {
      success: false,
      message: `Can't parse config JSON: '${config}' ${e.message})`,
    };
  }
  let projectDir = dir || ".";
  getLog().info("Project dir: " + projectDir);

  let packageFile = path.resolve(projectDir, "package.json");
  if (!fs.existsSync(packageFile)) {
    return { success: false, message: `Can't find package file ${packageFile}` };
  }
  let packageObj = JSON5.parse(fs.readFileSync(packageFile, "utf8"));
  let distFile = path.resolve(projectDir, getDistFile(packageObj));
  getLog().info("Dist file: " + distFile);
  if (!fs.existsSync(distFile)) {
    return {
      success: false,
      message: `Can't find dist file (${distFile}). Forgot to run \`${binName} extension build\`?`,
    };
  }
  getLog().info("🤔 Loading build from " + chalk.bold(distFile));
  let build = await loadBuild(distFile);
  getLog().info("👍 Module loaded!");
  if (!build.validator) {
    return { success: false, message: "Build doesn't export validator symbol" };
  }
  getLog().info("🤔 Validating configuration " + JSON.stringify(configObj));
  let validationError = await validateConfiguration(configObj, build.validator);
  if (validationError) {
    return { success: false, message: `❌ ${validationError}` };
  }

  getLog().info("✅ Config is valid. Hooray!");

  return { success: true };
}
