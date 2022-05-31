import { CommandResult } from "../../lib/command/types";
import path from "path";
import getLog from "../../lib/log";
import chalk from "chalk";
import fs from "fs";
import { appendError } from "../../lib/errors";
import { rollup } from "rollup";
import rollupTypescript from "rollup-plugin-typescript2";
import multi from "@rollup/plugin-multi-entry";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { jitsuCliVersion, jitsuPackageName } from "../../lib/version";
import { getDistFile, loadBuild, validateTsConfig } from "./";
import JSON5 from "json5";

export async function build(args: string[]): Promise<CommandResult> {
  const directory = args?.[0] || "";
  let projectBase = path.isAbsolute(directory) ? directory : path.resolve(process.cwd() + "/" + directory);
  getLog().info("🔨 Building project in " + chalk.bold(projectBase));
  if (!fs.existsSync(projectBase)) {
    throw new Error(`Path ${projectBase} does not exist`);
  }
  let packageFile = path.resolve(projectBase, "package.json");
  if (!fs.existsSync(packageFile)) {
    return { success: false, message: "Can't find package.json in " + projectBase };
  }
  let packageJson;
  try {
    packageJson = JSON5.parse(fs.readFileSync(packageFile, "utf8"));
  } catch (e) {
    throw new Error(appendError(`Failed to parse package.json at ${projectBase}`, e));
  }
  let distFile = getDistFile(packageJson);
  let fullOutputPath = path.resolve(projectBase, distFile);
  getLog().info("📦 Bundle will be written to " + chalk.bold(fullOutputPath));
  let tsConfigPath = path.resolve(projectBase, "tsconfig.json");

  const typescriptEnabled = fs.existsSync(tsConfigPath);
  if (typescriptEnabled) {
    getLog().info(`Found ${chalk.bold("tsconfig.json")}, typescript will be enabled`);
  } else {
    return {
      success: false,
      message: `${chalk.bold(
        "tsconfig.json"
      )} is not found in the root of the project. Pure JS extensions are not supported yet`,
    };
  }
  validateTsConfig(tsConfigPath);

  getLog().info("Building project");
  try {
    let indexFile = path.resolve(projectBase, "src/index.ts");
    if (!fs.existsSync(indexFile)) {
      return { success: false, message: `Project should have src/index.ts file. Can't find it at ${indexFile}` };
    }
    const bundle = await rollup({
      input: [indexFile],
      plugins: [typescriptEnabled && rollupTypescript({ cwd: projectBase }), multi(), resolve(), commonjs()],
    });
    getLog().info("Generating bundle");
    let output = await bundle.generate({
      generatedCode: "es2015",
      format: "cjs",
    });
    getLog().info("Validating build");
    let code = output.output[0].code;
    code += `\nexports.buildInfo = {sdkVersion: "${jitsuCliVersion}", sdkPackage: "${jitsuPackageName}", buildTimestamp: "${new Date().toISOString()}"}`;
    const exports = loadBuild(code);
    if (!exports.destination && !exports.transform) {
      return {
        success: false,
        message:
          `${chalk.bold(indexFile)} should export ${chalk.italic("destination")} or ${chalk.italic(
            "transform"
          )} symbol. It exports: ` + Object.keys(exports).join(", "),
      };
    } else if (exports.destination && exports.transform) {
      return {
        success: false,
        message:
          `${chalk.bold(indexFile)} exports both ${chalk.italic("destination")} and ${chalk.italic(
            "transform"
          )} symbol. It should export either of them` + Object.keys(exports).join(", "),
      };
    }
    fs.mkdirSync(path.dirname(fullOutputPath), { recursive: true });
    fs.writeFileSync(fullOutputPath, code);
  } catch (e: any) {
    if (e.id && e.loc && e.frame) {
      return {
        success: false,
        message:
          "Build failed: " +
          e.message +
          `\n\n  See: ${e.loc.file}:${e.loc.line}\n\n` +
          `${e.frame
            .split("\n")
            .map(ln => "  " + chalk.bgRed(" ") + " " + ln)
            .join("\n")}`,
      };
    }
    return { success: false, message: appendError("Build failed", e), details: e?.stack };
  }
  return { success: true };
}
