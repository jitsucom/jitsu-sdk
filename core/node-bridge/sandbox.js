const NodeVM = require("vm2").NodeVM;

const os = require("os");

function mockModule(moduleName, knownSymbols) {
  return new Proxy(
    {},
    {
      set(target, prop, value, receiver) {
        throw new Error(`Called ${moduleName}.${prop.toString()} with ${value} & ${receiver}`)
      },
      get: (target, prop) => {
        let known = knownSymbols[prop.toString()];
        if (known) {
          return known;
        } else {
          throw new Error(
            `Attempt to access ${moduleName}.${prop.toString()}, which is not safe. Allowed symbols: [${Object.keys(
              knownSymbols
            )}]`
          );
        }
      },
    }
  );
}

function throwOnMethods(module, members) {
  return members.reduce((obj, key) => ({ ...obj, [key]: throwOnCall(module, key) }), {});
}

function throwOnCall(module, prop) {
  return (...args) => {
    throw new Error(`Call to ${module}.${prop} is not allowed. Call arguments: ${[...args].join(", ")}`);
  };
}

/**
 * This function returns sandbox (vm2) that exposes
 * only safe symbols and globals
 */
function sandbox({ globals = {}, file } = {}) {
  return new NodeVM({
    console: "inherit",

    sandbox: {
      queueMicrotask: queueMicrotask,
      self: {},
      process: {
        versions: process.versions,
        version: process.version,
        stderr: process.stderr,
        stdout: process.stdout,
        env: {},
      },
      ...globals,
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
        "console",
      ],
      root: "./",

      mock: {
        fs: mockModule("fs", { ...throwOnMethods("fs", ["readFile", "realpath", "lstat"]) }),
        os: mockModule("os", { platform: os.platform, EOL: os.EOL }),
        child_process: {},
      },
      resolve: moduleName => {
        throw new Error(
          `The extension${
            file ? " " + file : ""
          } calls require('${moduleName}') which is not system module. Rollup should have linked it into JS code.`
        );
      },
    },
  });
}

exports.sandbox = sandbox;
