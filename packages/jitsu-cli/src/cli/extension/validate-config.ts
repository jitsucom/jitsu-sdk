import { CommandResult } from "../../lib/command/types";
import commander from "commander";
import chalk from "chalk";
import path from "path";
import fs from "fs";
import JSON5 from "json5";
import getLog from "../../lib/log";
import { getDistFile, loadBuild } from "./index";
import { validateConfiguration } from "../../lib/validator-helper";

export async function validateConfig(args: string[]): Promise<CommandResult> {
  const program = new commander.Command();
  program.option("-d, --dir <project_dir>", "Project directory");
  program.option("-c, --config <config_file>", "Configuration file");
  program.option("-o, --config-object <config_json>", "Inline extension configuration JSON");
  program.argument("[project_dir]");

  program.parse(["dummy", "dummy", ...args]);
  const opts = program.opts();

  if (!opts.configObject && !opts.config) {
    return {
      success: false,
      message: 'Please define config object either with -j "{embedded json}", or with -f json_file',
    };
  }
  let configObj;
  if (opts.configObject) {
    try {
      configObj = JSON5.parse(opts.configObject);
    } catch (e: any) {
      return { success: false, message: `Malformed json (-j): ${e.message}` };
    }
  } else {
    if (!fs.existsSync(opts.config)) {
      return { success: false, message: `${opts.config} (-f) doesn't exist!` };
    }
    try {
      configObj = JSON5.parse(fs.readFileSync(opts.config, "utf8"));
    } catch (e: any) {
      return { success: false, message: `Malformed json in file ${opts.config} (-f): ${e.message}` };
    }
  }
  let projectDir = opts.dir || ".";
  getLog().info("Project dir: " + projectDir);

  let packageFile = path.resolve(projectDir, "package.json");
  if (!fs.existsSync(packageFile)) {
    return { success: false, message: `Can't find package file ${packageFile}` };
  }
  let packageObj = JSON5.parse(fs.readFileSync(packageFile, "utf8"));
  let distFile = path.resolve(projectDir, getDistFile(packageObj));
  getLog().info("Dist file: " + distFile);
  if (!fs.existsSync(distFile)) {
    return { success: false, message: `Can't find dist file (${distFile}). Forgot to run jitsu-cli extension build ?` };
  }
  getLog().info("🤔 Loading build from " + chalk.bold(distFile));
  let build = loadBuild(fs.readFileSync(distFile, "utf8"));
  getLog().info("👍 Module loaded!");
  if (!build.validator) {
    return { success: false, message: "Build doesn't export validator symbol" };
  }
  getLog().info(
    "🤔 Validating configuration " +
      (opts.config ? `from file ${path.resolve(projectDir, opts.config)}` : JSON.stringify(configObj))
  );
  let validationError = await validateConfiguration(configObj, build.validator);
  if (validationError) {
    return { success: false, message: `❌ ${validationError}` }
  }

  getLog().info("✅ Config is valid. Hooray!");

  return { success: true };
}
