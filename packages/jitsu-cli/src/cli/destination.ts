import { CommandRegistry, CommandResult } from "../lib/command/types"
import chalk from "chalk"
import { chalkCode } from "../lib/chalk-code-highlight"
import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import commander from "commander"
import path from "path"
import getLog from "../lib/log"
import { appendError } from "../lib/errors"
import multi from "@rollup/plugin-multi-entry"
import * as fs from "fs"
import rollupTypescript from "rollup-plugin-typescript2"
import { rollup } from "rollup"
import { run as jest } from "jest-cli"
import { write } from "./template"
import { destinationProjectTemplate } from "./destination_template"
import inquirer from "inquirer"
import validateNpmPackage from "validate-npm-package-name"

const npmExample = chalkCode.json`
    {
      "name": "jitsu-destination-adapter",
      "main": "dist/index.js"
      "scripts": {  
        "build": "jitsu destination build",
        "test": "jitsu destination test",
      }
    }
`

const typescriptExample = chalkCode.typescript`
    const adapter: DestinationAdapter = (event: JitsuEvent, context: DestinationContext):DestinationMessage => {
        return {
            method: "POST",
            url: context.url,
            headers: {"Content-Type": "application/json"},
            body: event
        }
    }
    
    const descriptor: DestinationDescriptor = {
    type: "test",
    displayName: "Test destination",
    description: "Example project. Can be used as a template for new destinations.",
    configurationParameters: [
        {
            id: "url",
            type: "string",
            required: true,
            displayName: "URL",
            documentation: "Base URL of API server",
        }
    ],
    }
    
    export {descriptor, adapter}
`

const usage = `jitsu destination build <directory> — build project located in <directory>. If <directory> is not provided current directory is used.
   jitsu destination test  <directory> — run tests for project in <directory>. If <directory> is not provided current directory is used.
   jitsu destination help              — show help`

export const help = `

${chalk.bold("DESCRIPTION")}

  The command will build jitsu destination adapter and bundle a single JS file that will
  placed to a location defined in main parameter of package.json (if not set, the bundle
  will be placed in dist/index.js

  You can (and should!) call jitsu destination build in package.json. Example:${npmExample}

  The code should be located in ./src folder. src/index.js (or ts) should be present
  and it should export following symbols

  - ${chalk.bold("adapter   ")}   destination adapter function. See DestinationAdapter in 
                               @jitsu/types (destination.d.ts)
  - ${chalk.bold("descriptor")}   destination meta (config properties, name, icon, etc). See 
                               DestinationsDescriptor in @jitsu/types (destination.d.ts)
                               
${chalk.bold("EXAMPLE")}
  src/index.ts:${typescriptExample}
      
${chalk.bold("TYPESCRIPT")}

  Typescript is supported out of the box. Just add tsconfig.json to the root of the project

${chalk.bold("OPTIONS")}
     
   ${usage}
`

export const destinationCommands: CommandRegistry<"test" | "build" | "create"> = {
  test: {
    exec: test,
    description: "Execute test on destination",
    help: "Tests should be located in ./tests folder and follow *.test.ts pattern",
  },
  build: {
    exec: build,
    description: "Builds destination",
    help: "",
  },
  create: {
    exec: create,
    description: "Creates an empty project",
    help: "",
  },
}

function removeEmptyVals() {

}

async function create(args: string[]): Promise<CommandResult> {
  const program = new commander.Command()
  program
    .option("--name <project_name>", "project name", "")
    .option("--dir <project_dir>", "project dir", "")
  program.parse(args)
  let cliOpts = program.opts()
  if (cliOpts.name) {
    let isValid = validateNpmPackage(cliOpts.name)
    if (!isValid.validForNewPackages) {
      return { success: false, message: `Can't use ${cliOpts.name} as package name: ${isValid.errors}` }
    }
  }

  let packageName = cliOpts.name || (await inquirer.prompt([
    {
      type: "input",
      name: "package",
      message: "Please, provide project name:",
      validate: input => {
        let isValid = validateNpmPackage(input)
        if (!isValid.validForNewPackages) {
          return `Can't use ${input} as package name: ${isValid.errors}`
        }
        return true
      },
    },
  ])).package

  let projectDir = cliOpts.dir || (await inquirer.prompt([
    {
      type: "input",
      name: "directory",
      message: "Project directory:",
      default: path.resolve(".", packageName),
      validate: input => {
        let projectBase = path.resolve(input)
        if (fs.existsSync(projectBase)) {
          if (!fs.lstatSync(projectBase).isDirectory() || fs.readdirSync(projectBase).length > 0) {
            return `${input} should be an non-existent or empty directory`
          }
        }
        return true
      },
    },
  ])).package

  projectDir = path.resolve(projectDir)

  getLog().info("Creating new jitsu project in " + chalk.bold(projectDir))
  if (fs.existsSync(projectDir)) {
    if (!fs.lstatSync(projectDir).isDirectory() || fs.readdirSync(projectDir).length > 0) {
      return { success: false, message: `${projectDir} should be an empty directory` }
    }
  } else {
    getLog().info("Project directory doesn't exist, creating it!")
    fs.mkdirSync(projectDir, { recursive: true })
  }

  write(projectDir, destinationProjectTemplate, {
    packageName: packageName,
  })

  return { success: true }
}

async function build(args: string[]): Promise<CommandResult> {
  const directory = args?.[0] || ""
  let projectBase = path.isAbsolute(directory) ? directory : path.resolve(process.cwd() + "/" + directory)
  getLog().info("🔨 Building project in " + chalk.bold(projectBase))
  if (!fs.existsSync(projectBase)) {
    throw new Error(`Path ${projectBase} does not exist`)
  }
  let packageFile = path.resolve(projectBase, "package.json")
  if (!fs.existsSync(packageFile)) {
    return { success: false, message: "Can't find package.json in " + projectBase }
  }
  let packageJson
  try {
    packageJson = JSON.parse(fs.readFileSync(packageFile, "utf8"))
  } catch (e) {
    throw new Error(appendError(`Failed to parse package.json at ${projectBase}`, e))
  }
  let distFile = packageJson.main || "dist/index.js"
  let fullOutputPath = path.resolve(projectBase, distFile)
  getLog().info("📦 Bundle will be written to " + chalk.bold(fullOutputPath))
  let tsConfigPath = path.resolve(projectBase, "tsconfig.json")

  const typescriptEnabled = fs.existsSync(tsConfigPath)
  if (typescriptEnabled) {
    getLog().info(`Found ${chalk.bold("tsconfig.json")}, typescript will be enabled`)
  }

  getLog().info("Building project")
  try {
    let indexFile = path.resolve(projectBase, "src/index.ts")
    const bundle = await rollup({
      input: [indexFile],
      plugins: [typescriptEnabled && rollupTypescript({ cwd: projectBase }), multi(), resolve(), commonjs()],
    })
    getLog().info("Generating bundle")
    let output = await bundle.generate({
      generatedCode: "es5",
      format: "cjs",
    })
    getLog().info("Validating build")
    let evalRes = eval(`(function(exports) {
      ${output.output[0].code}
    })`)
    let exports = {}
    evalRes(exports)
    if (!exports["adapter"]) {
      return {
        success: false,
        message:
          `${chalk.bold(indexFile)} should export ${chalk.italic("adapter")} symbol. It exports: ` +
          Object.keys(exports).join(", "),
      }
    }
    fs.mkdirSync(path.dirname(fullOutputPath), { recursive: true })
    fs.writeFileSync(fullOutputPath, output.output[0].code)
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
      }
    }
    return { success: false, message: appendError("Build failed", e), details: e?.stack }
  }
  return { success: true }
}

async function test(args: string[]): Promise<CommandResult> {
  const directory = args?.[0] || ""
  let projectBase = path.isAbsolute(directory) ? directory : path.resolve(process.cwd() + "/" + directory)
  getLog().info("🛂 Running tests for " + chalk.bold(projectBase))
  let tsConfigPath = path.resolve(projectBase, "tsconfig.json")

  const typescriptEnabled = fs.existsSync(tsConfigPath)
  if (typescriptEnabled) {
    getLog().info(`ℹ️ Found ${chalk.bold("tsconfig.json")}, typescript will be enabled`)
  }
  let jestArgs = ["--passWithNoTests", "--projects", projectBase]
  if (typescriptEnabled) {
    jestArgs.push("--preset", "ts-jest")
  }
  await jest(jestArgs)

  return { success: true }
}
