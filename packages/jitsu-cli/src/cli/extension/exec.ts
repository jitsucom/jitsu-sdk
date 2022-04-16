import { CommandResult } from "../../lib/command/types";
import commander from "commander";
import getLog from "../../lib/log";
import chalk from "chalk";
import path from "path";
import * as JSON5 from "json5";
import fs from "fs";
import { getDistFile, loadBuild } from "./index";
import { align, jsonify } from "../../lib/indent";
import { chalkCode } from "../../lib/chalk-code-highlight";
import { appendError } from "../../lib/errors";
import { DestinationMessage, JitsuExtensionExport } from "@jitsu/types/extension";
import { validateConfiguration } from "../../lib/validation";
import { DataRecord, JitsuDataMessage, JitsuDataMessageType } from "@jitsu/types/sources";
import { build } from "./build";

import Table from "cli-table";
import { makeStreamSink } from "@jitsu/jlib/lib/sources-lib";

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

async function loadExtension(directory: string): Promise<{
  extension: Partial<JitsuExtensionExport>;
  distFile: string;
  projectBase: string;
}> {
  let projectBase = path.isAbsolute(directory) ? directory : path.resolve(process.cwd() + "/" + directory);
  let packageFile = path.resolve(projectBase, "package.json");
  if (!fs.existsSync(packageFile)) {
    throw new Error("Can't find package.json in " + projectBase);
  }
  let distFile = path.resolve(projectBase, getDistFile(JSON5.parse(fs.readFileSync(packageFile, "utf-8"))));
  getLog().info(
    "⌛️ Loading extension (don't forget to build it before running exec!). Source: " + chalk.bold(distFile)
  );
  if (!fs.existsSync(path.resolve(projectBase, distFile))) {
    throw new Error(
      `Can't find dist file ${chalk.bold(distFile)}. Does this dir contains jitsu extension? Have you run yarn build? `
    );
  }
  let extension = await loadBuild(distFile);

  return { extension, distFile, projectBase };
}

export async function execSourceExtension(args: string[]): Promise<CommandResult> {
  const program = new commander.Command();
  program.option("-c, --config <json>", "Connector configuration as JSON object");
  program.option("-d, --dir <project_dir>", "project dir");
  program.option(
    "-s, --stream-config <json>",
    "Stream configuration as an object. If connector exports one stream, this can be omitted"
  );
  program.parse(["dummy", "dummy", ...args]);
  let cliOpts = program.opts();

  let directory = cliOpts.dir || ".";
  await build([directory]);
  const { extension } = await loadExtension(directory);

  if (!extension.streamReader) {
    return { success: false, message: `Extension doesn't export ${chalk.bold("streamReader")} symbol` };
  }

  if (!extension.sourceCatalog) {
    return { success: false, message: `Extension doesn't export ${chalk.bold("sourceCatalog")} symbol` };
  }

  let configObject: any;
  try {
    configObject = JSON5.parse(cliOpts.config);
  } catch (e: any) {
    return {
      success: false,
      message: `Can't parse config JSON: '${cliOpts.config}' ${e.message})`,
    };
  }

  if (!extension.validator) {
    getLog().info("⚠️ Extension doesn't support connection validation");
  } else {
    getLog().info("⌛️ Validating connection parameters...");
    let validationError = await validateConfiguration(configObject, extension.validator);
    if (validationError) {
      return {
        success: false,
        message: `Configuration validation failed: ${validationError}`,
      };
    }
    getLog().info("🙌️ Configuration is valid!");
  }
  getLog().info("🏃 Getting available streams...");

  let streams = await extension.sourceCatalog(configObject);

  streams.forEach(stream => {
    let paramsDocs = (stream.params ?? []).map(param => `${param.id} - ${param.displayName}`).join(", ");
    getLog().info(
      `🌊 Stream: ${chalk.bold(stream.streamName)}. Parameters: ${paramsDocs.length > 0 ? paramsDocs : "none"}`
    );
  });
  let stream;
  let streamConfigObject = cliOpts.streamConfig && JSON5.parse(cliOpts.streamConfig);
  if (streams.length > 1) {
    if (!streamConfigObject) {
      return {
        success: false,
        message: `The connector exports more than one (${streams.length}) streams. Please specify stream name and config as -s {stream: 'name', ...}`,
      };
    }
    if (!streamConfigObject?.name) {
      return {
        success: false,
        message: `Connector defines multiple streams (${streams.map(
          s => s.streamName
        )}). Specify stream name as as: -s {name: 'name', ...}`,
      };
    }
    stream = streams.find(stream => stream.streamName === streamConfigObject?.name);
    if (!stream) {
      return { success: false, message: `Stream with ${streamConfigObject?.name} is not found` };
    }
  } else {
    stream = streams[0];
  }

  const resultTable = newTable();

  await extension.streamReader(
    configObject,
    stream.streamName,
    { params: streamConfigObject },
    makeStreamSink({
      msg<T extends JitsuDataMessageType, P>(msg: JitsuDataMessage<T, P>) {
        if (msg.type === "record") {
          add(resultTable, msg.message);
        }
      },
    }),
    {
      state: {
        set(key: string, object: any, opts: { expireInMs?: number }) {},
        get(key: string): any {
          return undefined;
        },
      },
    }
  );

  console.log(resultTable.rows);

  console.log(
    "Special column types: \n" +
      Object.entries(resultTable.columns)
        .filter(([colName, colValue]) => (colValue as any).types.length > 0)
        .map(([colName, colValue]) => `\t${colName}: ${(colValue as any).types}`)
        .join("\n")
  );

  return { success: true };
}

type Table = {
  rows: any[];
  columns: Record<string, { types: string[] }>;
};

function newTable() {
  return { rows: [], columns: {} };
}

function add(t: Table, rec: any) {
  //rec = flatten(rec);
  const newRow = {};
  for (const [key, val] of Object.entries(rec)) {
    if (key.indexOf("__sql_type") !== 0) {
      if (t.columns[key] === undefined) {
        //new column detected
        t.columns[key] = { types: [] };
        t.rows.forEach(row => (row[key] = undefined));
      }
      newRow[key] = Array.isArray(val) ? JSON.stringify(val) : val;
    } else {
      const columnName = key.substring("__sql_type".length);
      if (t.columns[columnName] === undefined) {
        t.columns[columnName] = { types: [] };
      }
      let uniqueTypes = new Set(t.columns[columnName].types);
      uniqueTypes.add(val as string);
      t.columns[columnName].types = [...uniqueTypes];
    }
  }
  Object.keys(t.columns).forEach(col => {
    //add missing columns
    if (newRow[col] === undefined) {
      newRow[col] = undefined;
    }
  });
  t.rows.push(newRow);
}

export async function execDestinationExtension(args: string[]): Promise<CommandResult> {
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
  const { extension, projectBase } = await loadExtension(directory);
  getLog().info("🛂 Executing tests destination on " + chalk.bold(projectBase));
  let events: any[] = toArray(getJson(cliOpts.json, cliOpts.file));
  let config = getJson(cliOpts.configObject, cliOpts.config);

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
      getLog().info(
        `✅ Event emitted ${messagesArray.length} messages. Event JSON: ` + chalk.italic(ellipsis(JSON.stringify(ev)))
      );
      messagesArray.forEach(msg => {
        getLog().info(`    ${chalk.bold(msg.method)} ${msg.url}`);
        if (msg.headers && Object.entries(msg).length > 0) {
          Object.entries(msg.headers).forEach(([h, v]) => {
            getLog().info(`     ${chalk.bold(h)}: ${v}`);
          });
        }
        if (msg.body) {
          getLog().info(
            "    Body:\n" + chalkCode.json(align(JSON.stringify(jsonify(msg.body), null, 2), { indent: 8 }))
          );
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
