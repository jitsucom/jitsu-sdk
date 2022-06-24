import { CommandRegistry } from "../../lib/command/types";
import chalk from "chalk";
import { chalkCode } from "../../lib/chalk-code-highlight";
import * as fs from "fs";
import { align } from "../../lib/indent";
import { create } from "./create";
import { build } from "./build";
import { test } from "./test";
import { validateConfig } from "./validate-config";
import { packageJsonTemplate } from "./template";
import { JitsuExtensionExport } from "@jitsu/types/extension";
import { Partial } from "rollup-plugin-typescript2/dist/partial";
import JSON5 from "json5";
import { execDestinationExtension, execSourceExtension } from "./exec";
import * as readline from "readline";
import { sandbox } from "@jitsu/node-bridge/sandbox";
//For new Function to get access to fetch
global.fetch = require("cross-fetch");

export function validateTsConfig(tsConfigPath: string) {
  let tsConfig: any;
  try {
    tsConfig = JSON5.parse(fs.readFileSync(tsConfigPath, "utf8"));
  } catch (e: any) {
    throw new Error(`${chalk.bold(tsConfigPath)} - syntax error: ${e.message}`);
  }
  // if (tsConfig?.compilerOptions?.target !== "es5") {
  //   throw new Error(`${chalk.bold(tsConfigPath)} error: compilerOptions.target should be set to es5!`);
  // }
  if (tsConfig?.compilerOptions?.module !== "ES2020") {
    throw new Error(`${chalk.bold(tsConfigPath)} error: compilerOptions.module should be set to ES2020!`);
  }
}

export function getDistFile(packageJson) {
  return packageJson.main || "dist/index.js";
}

async function getFirstLine(pathToFile): Promise<string> {
  const readable = fs.createReadStream(pathToFile);
  const reader = readline.createInterface({ input: readable });
  const line = await new Promise<string>(resolve => {
    reader.on("line", line => {
      reader.close();
      resolve(line);
    });
  });
  readable.close();
  return line;
}

export function getConfigJson(jsonOrFile: string) {
  if (jsonOrFile.trim().startsWith("{") && jsonOrFile.trim().endsWith("}")) {
    return JSON5.parse(jsonOrFile.trim());
  } else {
    if (!fs.existsSync(jsonOrFile)) {
      throw new Error(`File ${jsonOrFile} does not exist!`);
    }
    return JSON5.parse(fs.readFileSync(jsonOrFile, "utf8"));
  }
}

export async function loadBuild(file: string): Promise<Partial<JitsuExtensionExport>> {
  let formatDefinition = await getFirstLine(file);
  if (formatDefinition.trim() === "//format=es" || formatDefinition.trim() === "//format=esm") {
    return import(file);
  } else if (formatDefinition.trim() === "//format=cjs" || formatDefinition.trim() === "//format=commonjs") {
    const vm = sandbox({ file });
    return vm.runFile(file);
  } else {
    throw new Error(`Unsupported build format - ${formatDefinition}`);
  }
}
