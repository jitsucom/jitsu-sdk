import { CommandResult } from "../../lib/command/types";
import path from "path";
import getLog from "../../lib/log";
import chalk from "chalk";
import fs from "fs";
import { appendError } from "../../lib/errors";
import { ModuleFormat, ModuleInfo, rollup } from "rollup";
import rollupTypescript from "rollup-plugin-typescript2";
import multi from "@rollup/plugin-multi-entry";
import rollupJson from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import { jitsuCliVersion, jitsuPackageName } from "../../lib/version";
import { getDistFile, loadBuild, validateTsConfig } from "./";
import * as JSON5 from "json5";
import inject from "@rollup/plugin-inject";
import minimist from "minimist";

function fixNodeFetch(code: string) {
  /**
   * A very ugly attempt to fix an issue with node-fetch. Node fetch has in internal assertion that checks
   * if certain var is an instance of AbortSignal. It's done by constructor.name; however, rollup changes
   * the name of the class to AbortSignal$1, so the check fails.
   *
   * The fix is not universal, however it works!
   */
  return code.replace("throw new TypeError('Expected signal to be an instanceof AbortSignal');", "");
}

function insertStreamReaderFacade(targetFile) {
  return {
    name: "insert-stream-reader-facade",
    transform: async (code: string, id: string) => {
      const [path] = id.split("?");
      if (path === targetFile) {
        let newCode = [
          `import * as srcLib from "@jitsu/jlib/lib/sources-lib";`,
          code,
          ";",
          `export const __$srcLib = srcLib;`,
        ].join("\n");
        return { code: newCode };
      }
      return null;
    },
  };
}

export async function build(args: minimist.ParsedArgs): Promise<CommandResult> {
  const directory = args.dir || args.d || "";

  const projectBase = path.isAbsolute(directory) ? directory : path.resolve(process.cwd() + "/" + directory);
  getLog().info("🔨 Building project in " + chalk.bold(projectBase) + ` with ${jitsuPackageName}@${jitsuCliVersion} `);
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

  getLog().info("Building project...");
  try {
    let indexFile = path.resolve(projectBase, "src/index.ts");
    if (!fs.existsSync(indexFile)) {
      return { success: false, message: `Project should have src/index.ts file. Can't find it at ${indexFile}` };
    }
    const bundle = await rollup({
      input: [indexFile],
      plugins: [
        typescriptEnabled && rollupTypescript({ cwd: projectBase }),
        insertStreamReaderFacade(indexFile),
        multi(),
        resolve({ preferBuiltins: false }),
        commonjs(),
        rollupJson(),
      ],
    });

    let format: ModuleFormat = "cjs";
    let output = await bundle.generate({
      generatedCode: "es5",
      format: format,
      exports: "named",
      banner: `//format=${format}`,
      outro: [
        `exports.buildInfo = {sdkVersion: "${jitsuCliVersion}", sdkPackage: "${jitsuPackageName}", buildTimestamp: "${new Date().toISOString()}"};`,
        `exports.streamReader$StdoutFacade = exports.streamReader && __$srcLib.stdoutStreamReader(exports.streamReader);`,
      ].join("\n"),
      //preserveModules: true,
    });

    let code = fixNodeFetch(output.output[0].code);

    fs.mkdirSync(path.dirname(fullOutputPath), { recursive: true });
    fs.writeFileSync(fullOutputPath, code);
    getLog().info("Validating build");
    const exports = await loadBuild(fullOutputPath);
    if (!exports.destination && !exports.transform && !(exports.streamReader && exports.sourceCatalog)) {
      return {
        success: false,
        message:
          `${chalk.bold(indexFile)} should export ${chalk.italic("destination")}, ${chalk.italic(
            "transform"
          )} or both ${chalk.italic("streamReader")} and ${chalk.italic("sourceCatalog")} symbols. It exports: ` +
          Object.keys(exports).join(", "),
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
