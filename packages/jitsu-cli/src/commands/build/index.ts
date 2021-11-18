import {Command, CommandResult} from "../command";
import chalk from "chalk";
import {chalkCode} from "../../lib/chalk-code-highlight";
import path from "path";
import getLog from "../../lib/log";
import {appendError} from "../../lib/errors";
import * as fs from "fs";

const npmExample=chalkCode.json`
    {
      "name": "jitsu-destination-adapter",
      "main": "dist/index.js"
      "scripts": {  
        "build": "jitsu destination build",
      }
    }
`;

const typescriptExample=chalkCode.typescript`
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
    description: "Builds a Jitsu destination project",
    help,
    async exec(args: string[]): Promise<CommandResult> {
        let fullPath = path.resolve(process.cwd() + "/" + (args?.[0] || ''));
        getLog().info("🔨 Building project in " + chalk.bold(fullPath));
        if (!fs.existsSync(fullPath)) {
            throw new Error(`Path ${fullPath} does not exist`)
        }
        let packageFile = path.resolve(fullPath, 'package.json');
        if (!fs.existsSync(packageFile)) {
            return {success: false, message: 'Can\'t find package.json in ' + fullPath}
        }
        let packageJson;
        try {
            packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8'))
        } catch (e) {
            throw new Error(appendError(`Failed to parse package.json at ${fullPath}`, e))
        }
        let distFile = packageJson.main || 'dist/index.js';
        getLog().info("📦 Bundle will be written to " + chalk.bold(path.resolve(distFile)))

        return {success: true };
    }
}

export default buildCommand;