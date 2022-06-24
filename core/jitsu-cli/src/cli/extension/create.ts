import { CommandResult } from "../../lib/command/types";
import validateNpmPackage from "validate-npm-package-name";
import inquirer from "inquirer";
import chalk from "chalk";
import path from "path";
import fs from "fs";
import getLog from "../../lib/log";
import { write } from "../../lib/template";
import { extensionProjectTemplate } from "./template";
import type minimist from "minimist";

export async function create(args: minimist.ParsedArgs): Promise<CommandResult> {
  //We need those two 'dummies', commander expect to see all argv's here
  const dir = args.dir || args.d;

  const jitsuVersion = args["jitsu-version"] || args.j;
  const name = args.name || args.n;
  const type = args.type || args.t;

  if (name) {
    let isValid = validateNpmPackage(name);
    if (!isValid.validForNewPackages) {
      return { success: false, message: `Can't use ${name} as package name: ${isValid.errors}` };
    }
  }

  let packageType =
    type ||
    (
      await inquirer.prompt([
        {
          type: "list",
          name: "package",
          message: [
            `What is the type of extension?`,
            ` ${chalk.bold("destination")} adds a new type of HTTP-based destination to Jitsu`,
            ` ${chalk.bold("source")}   adds a new source extension to Jitsu`,
          ].join("\n"),
          choices: ["destination", "source"],
        },
      ])
    ).package;

  let packageName =
    name ||
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
    dir ||
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
    ).directory;
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
    jitsuVersion: jitsuVersion,
    type: packageType,
  });

  return { success: true };
}
