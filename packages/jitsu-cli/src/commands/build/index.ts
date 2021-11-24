import {Command, CommandResult} from "../command";
import chalk from "chalk";
import {chalkCode} from "../../lib/chalk-code-highlight";
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import {uglify} from 'rollup-plugin-uglify';

import path from "path";
import getLog from "../../lib/log";
import {appendError} from "../../lib/errors";
import multi from '@rollup/plugin-multi-entry';
import * as fs from "fs";
import rollupTypescript from 'rollup-plugin-typescript2';
import {rollup} from "rollup";

const npmExample = chalkCode.json`
    {
      "name": "jitsu-destination-adapter",
      "main": "dist/index.js"
      "scripts": {  
        "build": "jitsu destination build",
      }
    }
`;

const typescriptExample = chalkCode.typescript`
    const transform: DestinationAdapter = () => {}
    const meta: DestinationAdapter = {}
`;


const help = `

${chalk.bold('DESCRIPTION')}

  The command will build jitsu destination adapter and bundle a single JS file that will
  placed to a location defined in main parameter of package.json (if not set, the bundle
  will be placed in dist/index.js

  You can (and should!) call jitsu destination build in package.json. Example:${npmExample}

  The code should be located in ./src folder. src/index.js (or ts) should be present
  and it should export following symbols

  - ${chalk.bold('default')}   destination adapter function. See DestinationAdapter in 
                               @jitsu/types (destination.d.ts)
  - ${chalk.bold('meta   ')}   adapter meta (config properties, name, icon, etc). See 
                               DestinationsDescriptor in @jitsu/types (destination.d.ts)
  Example (src/index.ts):${typescriptExample}
      
${chalk.bold('TYPESCRIPT')}

  Type script is supported out of the box. Just add tsconfig.json to the root of the project

${chalk.bold('OPTIONS')}
     
   jitsu destination build <dir> — build project with <dir>. Optional, if not set current dir 
                                   will be used by default
         
     
`;

const buildCommand: Command = {
    description: "builds a Jitsu destination project",
    help,
    async exec(args: string[]): Promise<CommandResult> {
        let projectBase = path.resolve(process.cwd() + "/" + (args?.[0] || ''));
        getLog().info("🔨 Building project in " + chalk.bold(projectBase));
        if (!fs.existsSync(projectBase)) {
            throw new Error(`Path ${projectBase} does not exist`)
        }
        let packageFile = path.resolve(projectBase, 'package.json');
        if (!fs.existsSync(packageFile)) {
            return {success: false, message: 'Can\'t find package.json in ' + projectBase}
        }
        let packageJson;
        try {
            packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'))
        } catch (e) {
            throw new Error(appendError(`Failed to parse package.json at ${projectBase}`, e))
        }
        let distFile = packageJson.main || 'dist/index.js';
        let fullOutputPath = path.resolve(projectBase, distFile);
        getLog().info("📦 Bundle will be written to " + chalk.bold(fullOutputPath))
        let tsConfigPath = path.resolve(projectBase, "tsconfig.json");
        const typescriptEnabled = fs.existsSync(path.resolve(tsConfigPath));
        if (typescriptEnabled) {
            getLog().info(`ℹ️ Found ${chalk.bold('tsconfig.json')}, typescript will be enabled`)
        }
        getLog().info("Building project")
        try {
            let indexFile = path.resolve(projectBase, "src/index.ts");
            const bundle = await rollup({

                input: [
                    indexFile
                ],
                plugins: [
                    typescriptEnabled && rollupTypescript({tsconfig: tsConfigPath}),
                    multi(),
                    resolve(),
                    commonjs(),
                    uglify()
                ]
            })
            getLog().info("Generating bundle")
            let output = await bundle.generate({
                generatedCode: "es5",
                format: "cjs"
            });
            getLog().info("Validating build");
            let evalRes = eval(`(function(exports){${output.output[0].code}})`);
            let exports = {};
            evalRes(exports);
            if (!exports['adapter']) {
                return {success: false, message: `${chalk.bold(indexFile)} should export ${chalk.italic('adapter')} symbol. It exports: ` + Object.keys(exports).join(", ")}
            }
            fs.mkdirSync(path.dirname(fullOutputPath), {recursive: true})
            fs.writeFileSync(fullOutputPath, output.output[0].code)

        } catch (e: any) {
            if (e.id && e.loc && e.frame) {
                return {
                    success: false, message: 'Build failed: ' + e.message
                        + `\n\n  See: ${e.loc.file}:${e.loc.line}\n\n`
                        + `${e.frame.split("\n").map(ln => "  " + chalk.bgRed(" ") + " " + ln).join("\n")}`
                }
            }
            return {success: false, message: appendError('Build failed', e), details: e?.stack}
        }


        return {success: true};
    }
}

export default buildCommand;