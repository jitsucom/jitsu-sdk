import { CommandResult } from "../../lib/command/types";
import commander from "commander";
import validateNpmPackage from "validate-npm-package-name";
import inquirer from "inquirer";
import chalk from "chalk";
import path from "path";
import fs from "fs";
import getLog from "../../lib/log";
import { write } from "../../lib/template";
import { extensionProjectTemplate } from "./template";
import { getDistFile, loadBuild } from "./index";

export async function validateConfig(args: string[]): Promise<CommandResult> {
  const program = new commander.Command();
  program.option("-d, --dir <config_file>", "Project directory");
  program.option("-f, --file <config_file>", "Configuration file");
  program.option("-j, --json <config_json>", "Inline extension configuration JSON");
  program.argument("[project_dir]");

  program.parse(["dummy", "dummy", ...args]);
  const opts = program.opts();

  if (!opts.json && !opts.file) {
    return {
      success: false,
      message: 'Please define config object either with -j "{embedded json}", or with -f json_file',
    };
  }
  let configObj;
  if (opts.json) {
    try {
      configObj = JSON.parse(opts.json);
    } catch (e: any) {
      return { success: false, message: `Malformed json (-j): ${e.message}` };
    }
  } else {
    if (!fs.existsSync(opts.file)) {
      return { success: false, message: `${opts.file} (-f) doesn't exist!` };
    }
    try {
      configObj = JSON.parse(fs.readFileSync(opts.file, "utf8"));
    } catch (e: any) {
      return { success: false, message: `Malformed json in file ${opts.file} (-f): ${e.message}` };
    }
  }
  let packageFile = path.resolve(opts.project_dir || ".", "package.json");
  if (!fs.existsSync(packageFile)) {
    return { success: false, message: `Can't find package file ${packageFile}` };
  }
  let packageObj = JSON.parse(fs.readFileSync(packageFile, "utf8"));
  let distFile = getDistFile(packageObj);
  if (fs.existsSync(distFile)) {
    return { success: false, message: `Can't find dist file (${distFile}). Forget to run jitsu extension build?` };
  }
  getLog().info("🤔 Loading build from " + distFile);
  let build = loadBuild(fs.readFileSync(distFile, "utf8"));
  getLog().info("👍 Module loaded!");
  if (!build.validator) {
    return {success: false, message: "Build doesn't export validator symbol"}
  }
  getLog().info("🤔 Validating configuration...");
  let validationResult = await build.validator(configObj);
  if (typeof validationResult === "boolean" && !validationResult) {
    return {success: false, message: "❌ Config is not valid, an exact reason isn't specified by validator"}
  } else if (typeof validationResult === "string") {
    return {success: false, message: "❌ Config is not valid: " + validationResult}
  } else if (typeof validationResult === "object" && !validationResult.ok) {
    return {success: false, message: "❌ Config is not valid: " + validationResult.message}
  }
  getLog().info("✅ Config is valid. Hooray!")


  return { success: true };
}
