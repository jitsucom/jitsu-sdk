const NodeVM = require('vm2').NodeVM;

const os = require('os');

function mockModule(moduleName, knownSymbols) {
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
        fs: mockModule("fs", {}),
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

