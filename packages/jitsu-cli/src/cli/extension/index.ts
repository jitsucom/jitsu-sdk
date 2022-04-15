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
import getLog from "../../lib/log";
import { NodeVM } from "vm2";
import * as os from "os";
//For new Function to get access to fetch
global.fetch = require("cross-fetch");

const usage = `
  · ${chalk.bold("jitsu-cli extension create")}
    
    Create a project for jitsu plugin with placeholder implementation for all components.
    
  · ${chalk.bold("jitsu-cli extension build <directory>")}
    
    Build project located in <directory>. If <directory> is not provided current directory is used.
   
  · ${chalk.bold("jitsu-cli extension test  <directory>")}
    
    Run tests for project in <directory>/__test__. If <directory> is not provided current directory is used.
   
  · ${chalk.bold("jitsu-cli extension validate-config -f file or -j {json}")}
   
    Validates configuration json object. ${chalk.bold("Note:")} run \`jitsu-cli extension build\` beforehand 
    
  · ${chalk.bold("jitsu-cli extension help")}
   
    Show this help 
`;

export const help = `

${chalk.bold("DESCRIPTION")}

  The command will build jitsu extension and bundle a single JS file that will
  placed to a location defined in main parameter of package.json (if not set, the bundle
  will be placed in dist/index.js

  You can (and should!) call \`jitsu-cli extension build\` in package.json. Example: ${chalkCode.json(
    align(
      JSON.stringify(
        packageJsonTemplate({
          packageName: "test-package",
          type: "destination",
        }),
        null,
        2
      ),
      { indent: 4, lnBefore: 2 }
    )
  )}

  The code should be located in ./src folder. src/index.js (or ts) should be present
                               
${chalk.bold("TYPESCRIPT")}

  Typescript is supported out of the box. Just add tsconfig.json to the root of the project

${chalk.bold("COMMANDS")} ${align(usage, { indent: 2, lnBefore: 2 })}
`;

export const extensionCommands: CommandRegistry<"test" | "build" | "create" | "validate-config" | "exec" | "exec-src"> =
  {
    exec: {
      exec: execDestinationExtension,
      description: "Execute destination extension on a test dataset",
      help: "",
    },
    "exec-src": {
      exec: execSourceExtension,
      description: "Builds and execute source connector extension with a test credentials and output data",
      help: "",
    },
    test: {
      exec: test,
      description: "Execute test on extension",
      help: "Tests should be located in ./__test__ folder and follow *.test.ts pattern",
    },
    build: {
      exec: build,
      description: "Builds Jitsu extension",
      help: "",
    },
    create: {
      exec: create,
      description: "Creates an empty project",
      help: "",
    },
    "validate-config": {
      exec: validateConfig,
      description: `Verifies a configuration. ${chalk.bold("Note:")} run \`jitsu-cli extension build\` first!`,
      help: "",
    },
  };

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


function mockModule(moduleName: string, knownSymbols: Record<string, any>) {
  return new Proxy(
    {},
    {
      get: (target, prop) => {
        let known = knownSymbols[prop.toString()];
        if (known) {
          return known;
        } else {
          throw new Error(`Attempt to call ${moduleName}.${prop.toString()} which is not safe`);
        }
      },
    }
  );
}


export async function loadBuild(file: string): Promise<Partial<JitsuExtensionExport>> {
  let formatDefinition = await getFirstLine(file);
  if (formatDefinition.trim() === "//format=es" || formatDefinition.trim() === "//format=esm") {
    return import(file);
  } else if (formatDefinition.trim() === "//format=cjs" || formatDefinition.trim() === "//format=commonjs") {
    const vm = new NodeVM({
      console: "inherit",

      sandbox: {
        queueMicrotask: queueMicrotask,
        self: { },
        process: {
          versions: process.versions,
          version: process.version,
          stderr: process.stderr,
          env: {},
        },
      },
      require: {
        context: "sandbox",
        external: false,
        builtin: [
          "stream",
          "http",
          "url",
          "http2",
          "dns",
          "punycode",
          "https",
          "zlib",
          "events",
          "net",
          "tls",
          "buffer",
          "string_decoder",
          "assert",
          "util",
          "crypto",
          "path",
          "tty",
          "querystring",
          "console"
        ],
        root: "./",

        mock: {
          fs: mockModule("fs", {}),
          os: mockModule("os", { platform: os.platform, EOL: os.EOL }),
          child_process: {}
        },
        resolve: moduleName => {

          throw new Error(`The extension ${file} calls require('${moduleName}') which is not system module. Rollup should have linked it into JS code.`)
        }
      },
    });

    return vm.runFile(file);
  } else {
    throw new Error(`Unsupported build format - ${formatDefinition}`);
  }
}
