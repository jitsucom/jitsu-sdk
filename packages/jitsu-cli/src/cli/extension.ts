import { CommandRegistry, CommandResult } from "../lib/command/types";
import chalk from "chalk";
import { chalkCode } from "../lib/chalk-code-highlight";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import commander from "commander";
import path from "path";
import getLog from "../lib/log";
import { appendError } from "../lib/errors";
import multi from "@rollup/plugin-multi-entry";
import * as fs from "fs";
import rollupTypescript from "rollup-plugin-typescript2";
import { rollup } from "rollup";
import { run as jest } from "jest-cli";
import { write } from "../lib/template";
import { extensionProjectTemplate, packageJsonTemplate } from "./extension_template";
import inquirer from "inquirer";
import validateNpmPackage from "validate-npm-package-name";
import { align } from "../lib/indent";

const usage = `
   jitsu extension build <directory> — build project located in <directory>. If <directory> is not provided current directory is used.
   jitsu extension test  <directory> — run tests for project in <directory>/__test__. If <directory> is not provided current directory is used.
   jitsu extension help              — show help`;

export const help = `

${chalk.bold("DESCRIPTION")}

  The command will build jitsu extension and bundle a single JS file that will
  placed to a location defined in main parameter of package.json (if not set, the bundle
  will be placed in dist/index.js

  You can (and should!) call \`jitsu extension build\` in package.json. Example: ${chalkCode.json(
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

${chalk.bold("OPTIONS")} ${align(usage, { indent: 2, lnBefore: 2 })}
`;

export const extensionCommands: CommandRegistry<"test" | "build" | "create"> = {
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
};

function removeEmptyVals() {}

async function create(args: string[]): Promise<CommandResult> {
  const program = new commander.Command();
  program.option("-t, --type <project type>", "project type (destination or transform)");
  program.option("-d, --dir <project_dir>", "project dir");
  program.option("-n, --name <project_name>", "project name");
  program.option("-j, --jitsu-version <jitsu_version>", "Jitsu version");
  //We need those two 'dummies', commander expect to see all argv's here
  program.parse(["dummy", "dummy", ...args]);
  let cliOpts = program.opts();
  if (cliOpts.name) {
    let isValid = validateNpmPackage(cliOpts.name);
    if (!isValid.validForNewPackages) {
      return { success: false, message: `Can't use ${cliOpts.name} as package name: ${isValid.errors}` };
    }
  }

  let packageType =
    cliOpts.type ||
    (
      await inquirer.prompt([
        {
          type: "list",
          name: "package",
          message: [
            `What is the type of extension?`,
            ` ${chalk.bold('destination')} adds a new type of HTTP-based destination to Jitsu`,
            ` ${chalk.bold('transform')}   adds a transformation logic`,
          ].join("\n"),
          choices: ['destination', 'transform'],
        },
      ])
    ).package;

  let packageName =
    cliOpts.name ||
    (
      await inquirer.prompt([
        {
          type: "input",
          name: "package",
          message: "Please, provide project name:",
          validate: input => {
            let isValid = validateNpmPackage(input);
            if (!isValid.validForNewPackages) {
              return `Can't use ${input} as package name: ${isValid.errors}`;
            }
            return true;
          },
        },
      ])
    ).package;

  let projectDir =
    cliOpts.dir ||
    (
      await inquirer.prompt([
        {
          type: "input",
          name: "directory",
          message: "Project directory:",
          default: path.resolve(".", packageName),
          validate: input => {
            let projectBase = path.resolve(input);
            if (fs.existsSync(projectBase)) {
              if (!fs.lstatSync(projectBase).isDirectory() || fs.readdirSync(projectBase).length > 0) {
                return `${input} should be an non-existent or empty directory`;
              }
            }
            return true;
          },
        },
      ])
    ).package;

  projectDir = path.resolve(projectDir);

  getLog().info("Creating new jitsu project in " + chalk.bold(projectDir));
  if (fs.existsSync(projectDir)) {
    if (!fs.lstatSync(projectDir).isDirectory() || fs.readdirSync(projectDir).length > 0) {
      return { success: false, message: `${projectDir} should be an empty directory` };
    }
  } else {
    getLog().info("Project directory doesn't exist, creating it!");
    fs.mkdirSync(projectDir, { recursive: true });
  }

  write(projectDir, extensionProjectTemplate, {
    packageName: packageName,
    jitsuVersion: cliOpts.jitsuVersion,
    type: packageType
  });

  return { success: true };
}

async function build(args: string[]): Promise<CommandResult> {
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
    packageJson = JSON.parse(fs.readFileSync(packageFile, "utf8"));
  } catch (e) {
    throw new Error(appendError(`Failed to parse package.json at ${projectBase}`, e));
  }
  let distFile = packageJson.main || "dist/index.js";
  let fullOutputPath = path.resolve(projectBase, distFile);
  getLog().info("📦 Bundle will be written to " + chalk.bold(fullOutputPath));
  let tsConfigPath = path.resolve(projectBase, "tsconfig.json");

  const typescriptEnabled = fs.existsSync(tsConfigPath);
  if (typescriptEnabled) {
    getLog().info(`Found ${chalk.bold("tsconfig.json")}, typescript will be enabled`);
  }

  getLog().info("Building project");
  try {
    let indexFile = path.resolve(projectBase, "src/index.ts");
    const bundle = await rollup({
      input: [indexFile],
      plugins: [typescriptEnabled && rollupTypescript({ cwd: projectBase }), multi(), resolve(), commonjs()],
    });
    getLog().info("Generating bundle");
    let output = await bundle.generate({
      generatedCode: "es5",
      format: "cjs",
    });
    getLog().info("Validating build");
    let evalRes = eval(`(function(exports) {
      ${output.output[0].code}
    })`);
    let exports = {};
    evalRes(exports);
    if (!exports["destination"]) {
      return {
        success: false,
        message:
          `${chalk.bold(indexFile)} should export ${chalk.italic("destination")} symbol. It exports: ` +
          Object.keys(exports).join(", "),
      };
    }
    fs.mkdirSync(path.dirname(fullOutputPath), { recursive: true });
    fs.writeFileSync(fullOutputPath, output.output[0].code);
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

async function test(args: string[]): Promise<CommandResult> {
  const directory = args?.[0] || "";
  let projectBase = path.isAbsolute(directory) ? directory : path.resolve(process.cwd() + "/" + directory);
  getLog().info("🛂 Running tests for " + chalk.bold(projectBase));
  let tsConfigPath = path.resolve(projectBase, "tsconfig.json");

  const typescriptEnabled = fs.existsSync(tsConfigPath);
  if (typescriptEnabled) {
    getLog().info(`ℹ️ Found ${chalk.bold("tsconfig.json")}, typescript will be enabled`);
  }
  let jestArgs = ["--passWithNoTests", "--projects", projectBase];
  if (typescriptEnabled) {
    jestArgs.push("--preset", "ts-jest");
  }
  await jest(jestArgs);

  return { success: true };
}
