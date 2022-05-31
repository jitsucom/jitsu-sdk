import { CommandResult } from "../../lib/command/types";
import commander from "commander";
import getLog from "../../lib/log";
import chalk from "chalk";
import path from "path";
import JSON5 from "json5";
import fs from "fs";
import { getDistFile, loadBuild } from "./index";
import { doc } from "prettier";
import { align, jsonify } from "../../lib/indent";
import { chalkCode } from "../../lib/chalk-code-highlight";
import { validateConfiguration } from "../../lib/validator-helper";
import { appendError } from "../../lib/errors";
import { DestinationMessage } from "@jitsu/types/extension";

function getJson(json: string, file: string) {
  if (json) {
    return JSON5.parse(json);
  } else {
    if (!fs.existsSync(file)) {
      throw new Error(`File ${file} does not exist!`);
    }
    return JSON5.parse(fs.readFileSync(file, "utf-8"));
  }
}

function ellipsis(str: string, opts: { maxLen?: number } = { maxLen: 80 }) {
  const maxLen = opts?.maxLen || 80;
  return str.length < maxLen ? str : str.substring(0, maxLen - 3) + "...";
}

function toArray(obj: any) {
  if (!(typeof obj === "object" && Array.isArray(obj))) {
    return [obj];
  } else {
    return obj;
  }
}

export async function execExtension(args: string[]): Promise<CommandResult> {
  const program = new commander.Command();
  program.option(
    "-f, --file <file path>",
    "Path to file with jitsu events. Could be either on object, or array of objects"
  );
  program.option("-c, --config <file path>", "Path to file with config ");
  program.option("-o, --config-object <file path>", "Config json");
  program.option(
    "-j, --json <event json>",
    "Events JSON for processing (alternative to -f). Could be one object, or array of objects"
  );
  program.option("-d, --dir <project_dir>", "project dir");
  program.option("-v, --skip-validation", "To skip config validation");
  //We need those two 'dummies', commander expect to see all argv's here
  program.parse(["dummy", "dummy", ...args]);
  let cliOpts = program.opts();
  let directory = cliOpts.dir || ".";
  let projectBase = path.isAbsolute(directory) ? directory : path.resolve(process.cwd() + "/" + directory);
  let packageFile = path.resolve(projectBase, "package.json");
  if (!fs.existsSync(packageFile)) {
    return { success: false, message: "Can't find package.json in " + projectBase };
  }
  if (!cliOpts.json && !cliOpts.file) {
    return { success: false, message: "Please specify -j or -f" };
  }
  if (cliOpts.json && cliOpts.file) {
    return { success: false, message: "Both options -f and -j are provided. You should use either, not both" };
  }
  if (cliOpts.config && cliOpts.configObject) {
    return { success: false, message: "Both options -o and -c are provided. You should use either, not both" };
  }
  if (!cliOpts.config && !cliOpts.configObject) {
    return { success: false, message: "Please specify -o or -c" };
  }
  getLog().info("🛂 Executing tests destination on " + chalk.bold(projectBase));
  let events: any[] = toArray(getJson(cliOpts.json, cliOpts.file));
  let config = getJson(cliOpts.configObject, cliOpts.config);
  let distFile = path.resolve(projectBase, getDistFile(JSON5.parse(fs.readFileSync(packageFile, "utf-8"))));
  getLog().info("⌛️ Loading destination plugin (don't forget to build it before running exec!). Source: " + chalk.bold(distFile));
  if (!fs.existsSync(path.resolve(projectBase, distFile))) {
    return {
      success: false,
      message: `Can't find dist file ${chalk.bold(distFile)}. Does this dir contains jitsu extension? Have you run yarn build? `,
    };
  }
  let extension = loadBuild(fs.readFileSync(distFile, "utf-8"));
  if (!extension.destination) {
    return { success: false, message: "Extension doesn't export destination function" };
  }
  if (!cliOpts.skipValidation && extension.validator) {
    getLog().info(
      `Validating configuration:${chalkCode.json(
        align(JSON.stringify(config, null, 2), { indent: 4, lnBefore: 1, lnAfter: 1 })
      )}`
    );
    let configError = await validateConfiguration(config, extension.validator);
    if (configError) {
      return { success: false, message: "Config is not valid: " + configError };
    }
    getLog().info("✅ Configuration is valid!");
  } else {
    getLog().info(
      "💡 Config validation will be skipped " +
        (cliOpts.skipValidation ? " as per requested by -v flag" : ": extension does not have an exported validator")
    );
  }

  getLog().info("🏃 Running destination plugin on " + events.length + " events");
  for (const ev of events) {
    try {
      let messages = await extension.destination(ev as any, {
        destinationId: "test",
        destinationType: "test",
        config: config,
      });
      if (!messages) {
        getLog().info("⚽ Event is skipped: " + ellipsis(JSON.stringify(ev)));
        continue;
      }
      const messagesArray: DestinationMessage[] = Array.isArray(messages) ? messages : [messages];
      getLog().info(`✅ Event emitted ${messagesArray.length} messages. Event JSON: ` + chalk.italic(ellipsis(JSON.stringify(ev))));
      messagesArray.forEach(msg => {
        getLog().info(`    ${chalk.bold(msg.method)} ${msg.url}`);
        if (msg.headers && Object.entries(msg).length > 0) {
          Object.entries(msg.headers).forEach(([h, v]) => {
            getLog().info(`     ${chalk.bold(h)}: ${v}`);
          })
        }
        if (msg.body) {
          getLog().info("    Body:\n" + chalkCode.json(align(JSON.stringify(jsonify(msg.body), null, 2), { indent: 8 })));
        }
      });
    } catch (e) {
      getLog().info(
        chalk.red(
          appendError("❌ Failed to process event", e) +
            align(JSON.stringify(ev, null, 2), { lnBefore: 1, lnAfter: 1, indent: 0 })
        )
      );
    }
  }
  return { success: true };
}
