import { build } from "./extension/build";
import { binName, CommandArgument, CommandRunner, route, RouterConfig } from "./router";
import { create } from "./extension/create";
import { exec } from "./extension/exec";
import { test } from "./extension/test";
import { validateConfig } from "./extension/validate-config";
import chalk from "chalk";
import getLog from "../lib/log";
import minimist from "minimist";
import { JSONSchema4 } from "json-schema";
import { parse } from "json-schema-to-typescript/dist/src/parser";

import destination from "../model/destination.json";
import stream from "../model/stream.json";
import { DEFAULT_OPTIONS } from "json-schema-to-typescript";
import { directoryBackedFactory } from "../config-store";
import { flatten } from "../../../jlib";
import path from "path";

const coreDestinations = {
  postgres: "PostgresDestinationProperties",
  bigquery: "BigQueryDestinationProperties",
};

const dirArg: CommandArgument = {
  name: ["dir", "d"],
  value: "dir",
  description: "Project root directory",
};
const fileOrObjectValue = "File or JSON object";
const configArg: CommandArgument = {
  name: ["config", "c"],
  value: fileOrObjectValue,
  description: "Extension configuration - either path to a file with config object, or inlined JSON.",
};

const serverArg: (opts: { required: boolean }) => CommandArgument = ({ required }) => ({
  name: ["server", "s"],
  description: [
    "Comma-separated List of Jitsu servers as server1:8000,server2:8000. It's not necessary",
    "to list all servers in the cluster. The client will connect to a random server from the list",
  ].join("\n"),
  required,
  value: "list of jitsu servers",
});

const authArg: (opts: { required: boolean }) => CommandArgument = ({ required }) => ({
  name: ["auth", "t"],
  description: [`Jitsu cluster auth token. The token should be obtained with ${binName} cluster setup`].join("\n"),
  required,
  value: "auth token",
});

const projectId: CommandArgument = {
  name: ["project", "p"],
  value: "Project ID",
  description: "If you have access to multiple projects, you must specify project id",
};

const idArg: (opts: { subject: string }) => CommandArgument = ({ subject }) => ({
  name: ["id", "d"],
  required: true,
  description: `${subject} id`,
});

const notImplemented: CommandRunner = (args: minimist.ParsedArgs) => {
  console.log(`The command ${args._.join(" ")} is not implemented yet`);
  return Promise.resolve({ success: true });
};

function argsFromSchema(schema: JSONSchema4, baseType: string, types: Record<string, string>): CommandArgument[] {
  const baseProperties = schema.$defs[baseType].properties as Record<string, JSONSchema4>;

  const options: Record<string, { schema: JSONSchema4; appliedTo: string[] }> = {};
  Object.entries(baseProperties).forEach(([name, schema]) => {
    options[name] = {
      schema,
      appliedTo: [],
    };
  });

  for (const [variantName, variantRef] of Object.entries(types)) {
    const variantSchema = schema.$defs[variantRef].allOf[1].properties as Record<string, JSONSchema4>;
    Object.entries(variantSchema).forEach(([name, schema]) => {
      options[name] = {
        schema,
        appliedTo: [variantName, ...(options[name]?.appliedTo || [])],
      };
    });
  }
  return Object.entries(options).map(([name, opt]) => ({
    name: [name],
    value: "value",
    description:
      (opt.appliedTo.length > 0 ? `(applies to ${opt.appliedTo.join(", ")} destinations) ` : "") +
      (opt.schema.documentation || ""),
    required: false,
  }));
}

type CommandSet = {
  name: string;
  noun?: string;
  schema: JSONSchema4;
  baseType: string;
  types: Record<string, string>;
};

function requireArg(args: minimist.ParsedArgs, arg: string) {
  if (!args[arg]) {
    throw new Error(`Argument --${arg} is required`);
  } else {
    return args[arg];
  }
}

function without<T, P extends keyof T>(obj: T, ...keys: P[]): Omit<T, P> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

function entityManagementCommandSet(props: CommandSet): RouterConfig {
  const { name, noun = name, schema, baseType, types } = props;
  const dataPath = path.resolve("./.jitsu/configs/");
  const storeFactory = directoryBackedFactory(dataPath);
  return {
    list: {
      run: async (args: minimist.ParsedArgs) => {
        const list = await storeFactory(requireArg(args, "project"), name).list();
        if (list.length === 0) {
          console.log(`${noun}s list is empty for this project`);
        } else {
          console.table(list.map(item => ({ id: item.id, name: item?.name || "-" })));
        }
        return { success: true };
      },
      aliases: ["ls"],
      description: `List all ${noun}s`,
      args: [projectId, serverArg({ required: false }), authArg({ required: false })],
    },
    create: {
      aliases: ["add"],
      run: async (args: minimist.ParsedArgs) => {
        const store = await storeFactory(requireArg(args, "project"), name);
        const obj = without(args, "_", "project", "id", "format");
        const created = await store.create(obj);
        console.log(args.format === "short" ? created.id : `${noun} ${created.id} created: ${JSON.stringify(created)}`);
        return { success: true };
      },
      showHelpOnNoArgs: true,
      description: `Add ${noun} to jitsu config`,
      args: [
        projectId,
        serverArg({ required: false }),
        authArg({ required: false }),
        ...argsFromSchema(schema, baseType, types),
      ],
    },
    update: {
      run: async (args: minimist.ParsedArgs) => {
        const store = await storeFactory(requireArg(args, "project"), name);
        const obj = without(args, "_", "project", "id", "format");
        const id = requireArg(args, "id");
        const updated = await store.patch(id, obj);
        if (args.format !== "short") {
          console.log(`${noun} ${id} updated: ${JSON.stringify(updated)}`);
        }
        return { success: true };
      },
      showHelpOnNoArgs: true,
      description: `Update ${noun}`,
      args: [projectId, idArg({ subject: name }), serverArg({ required: false }), authArg({ required: false })],
    },
    describe: {
      run: async (args: minimist.ParsedArgs) => {
        const store = await storeFactory(requireArg(args, "project"), name);
        const id = requireArg(args, "id");
        const obj = await store.get(id);
        if (!obj) {
          return { success: false, message: `${noun} ${id} not found` };
        } else {
          console.log(JSON.stringify(obj, null, 2));
          return { success: true };
        }
      },
      showHelpOnNoArgs: true,
      description: `Describe ${noun} objec`,
      args: [projectId, idArg({ subject: name }), serverArg({ required: false }), authArg({ required: false })],
    },
    delete: {
      run: async (args: minimist.ParsedArgs) => {
        const store = await storeFactory(requireArg(args, "project"), name);
        const id = requireArg(args, "id");
        const updated = await store.remove(id);
        if (args.format !== "short") {
          console.log(`${noun} ${id} removed: ${JSON.stringify(updated)}`);
        }
        return { success: true };
      },
      showHelpOnNoArgs: true,
      description: `Delete ${noun}`,
      args: [projectId, idArg({ subject: name }), serverArg({ required: false }), authArg({ required: false })],
    },
  };
}

const commands: RouterConfig = {
  cluster: {
    setup: {
      run: notImplemented,
      showHelpOnNoArgs: true,
      description: "Setup jitsu cluster",
      args: [serverArg({ required: true }), authArg({ required: true })],
    },
    login: {
      run: notImplemented,
      showHelpOnNoArgs: true,
      description: "Login to local jitsu cluster",
      args: [serverArg({ required: true }), authArg({ required: true })],
    },
    logout: {
      run: notImplemented,
      description: "Logout from Jitsu cluster",
    },
  },
  config: {
    projects: {
      list: {
        run: notImplemented,
        description: "Login to local jitsu cluster",
        args: [serverArg({ required: false }), authArg({ required: false })],
      },
    },
    destination: entityManagementCommandSet({
      name: "destination",
      schema: destination as JSONSchema4,
      baseType: "BaseDestinationProperties",
      types: coreDestinations,
    }),
    //stream: entityManagementCommandSet("event stream", destination as JSONSchema4, "BaseDestinationProperties", coreDestinations),
  },
  extension: {
    $commandGroupDescription: "commands for creating, building and testing Jitsu extensions",
    build: {
      run: build,
      description: "Build the jitsu extension project",
      args: [dirArg],
    },
    create: {
      run: create,
      description: "Create new extension",
      args: [
        dirArg,
        { name: ["name", "n"], description: "Name of a project", value: "name" },
        { name: ["type", "t"], description: "Type of the project", value: "destination or source", required: false },
        {
          name: ["jitsu-version", "j"],
          description: "Version of a Jitsu SDK. The latest version by default. Use with caution!",
          value: "version",
          required: false,
        },
      ],
    },
    exec: {
      run: exec,
      description: "Execute jitsu extension",
      showHelpOnNoArgs: true,
      args: [
        dirArg,
        configArg,
        {
          name: ["stream", "s"],
          value: fileOrObjectValue,
          description: "Only for sources: Stream configuration as an object",
          required: false,
        },
        {
          name: ["state", "t"],
          value: fileOrObjectValue,
          description: "Only for sources: Saved state object to file",
          required: false,
        },

        {
          name: ["file", "f"],
          value: "file",
          description:
            "Only for destinations: path to file with jitsu events. File can contain either array of objects, or just one object",
          required: false,
        },
        {
          name: ["json", "j"],
          value: "JSON object",
          description:
            "Only for destinations: events JSON for processing (alternative to -f). Could be one object, or array of objects",
          required: false,
        },
        { name: ["skip-validation", "v"], description: "Only for destinations: skip validation", required: false },
      ],
      aliases: "exec-src",
    },
    test: {
      run: test,
      description: "Execute tests on jitsu extension",
      args: [dirArg],
    },
    validate: {
      run: validateConfig,
      showHelpOnNoArgs: true,
      description: "Validates the configuration of the extension",
      args: [dirArg, configArg],
      aliases: "validate-config",
    },
  },
};

export async function cliEntryPoint(args: string[]): Promise<number> {
  const result = await route(commands, args);
  if (result.success) {
    getLog().info("✨ Done");
    return 0;
  } else {
    process.stderr.write(chalk.red("Error!") + " - " + result.message + "\n");
    process.stderr.write(`Run ${chalk.bold(binName + " help")} for more info.\n`);
    if (result.details) {
      process.stderr.write(`\n${result.details}\n`);
    }
    return 1;
  }
}
