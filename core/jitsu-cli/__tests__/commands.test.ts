import { run } from "../src/run";
import * as fs from "fs";
import path from "path";
import { spawn, spawnSync } from "child_process";
import chalk from "chalk";
import getLog from "../src/lib/log";

async function cmd(args?: string): Promise<{ exitCode: number; stderr: string }> {
  let originalError = console.error;
  let originalInfo = console.info;
  let consoleOutput: any[] = [];
  console.error = console.info = jest.fn(args => {
    let line = Array.isArray(args) ? args.join(" ") : args;
    consoleOutput.push(...line.split("\n"));
  });
  let exitCode: number;
  try {
    exitCode = await run(args ? args.split(" ") : []);
    let header = `   jitsu-cli ${args || ""}, code: ${exitCode} `;
    originalInfo(
      [
        chalk.bgBlue.white(header),
        chalk.bgBlue(" "),
        ...consoleOutput.map(ln => chalk.bgBlue(" ") + ` ${ln}`),
        chalk.bgBlue(" "),
        chalk.bgBlue(" ".repeat(header.length)),
      ].join("\n")
    );
  } finally {
    console.error = originalError;
    console.info = originalInfo;
  }
  return { exitCode, stderr: consoleOutput.map(ln => `| ${ln}`).join("\n") };
}

test("jitsu-cli", async () => {
  let result = await cmd();
  expect(result.exitCode).toBe(0);
});

test("jitsu-cli help", async () => {
  let result = await cmd("help");
  expect(result.exitCode).toBe(0);
});

test("jitsu-cli extension", async () => {
  let result = await cmd("extension");
  expect(result.exitCode).toBe(0);
});

test("jitsu-cli extension help", async () => {
  let result = await cmd("extension help");
  expect(result.exitCode).toBe(0);
});

function summary(cmd, cmdResult) {
  let stderrStr = cmdResult.stderr?.toString();
  let stdoutStr = cmdResult.stdout?.toString();
  const lines = [
    chalk.bgBlue.white(" EXEC:  " + cmd + " => " + cmdResult.status + " "),
    ...(stdoutStr?.length > 0 ? stdoutStr.split("\n").map(ln => chalk.bgBlue.white(" stdout ") + " " + ln) : [null]),
    ...(stderrStr?.length > 0 ? stderrStr.split("\n").map(ln => chalk.bgBlue.red(" stderr ") + " " + ln) : [null]),
  ].filter(el => el !== null);
  console.info(lines.join("\n"));
}

async function exec(cmd: string, opts: { dir?: string } = {}) {
  getLog().info(`Running ${cmd} in dir ${opts.dir || path.resolve(process.cwd())}`);
  let cmdResult = await spawnSync(cmd, { cwd: opts.dir || ".", shell: true });
  summary(cmd, cmdResult);
  return cmdResult.status;
}

function amendJson(file: string, callback: (json: any) => any) {
  fs.writeFileSync(file, JSON.stringify(callback(JSON.parse(fs.readFileSync(file, "utf-8"))), null, 2));
}

function changeDep(pkg: any, name: string, version: string) {
  if (pkg["dependencies"][name]) {
    pkg["dependencies"][name] = version;
  }
  if (pkg["devDependencies"][name]) {
    pkg["devDependencies"][name] = version;
  }
}

test("jitsu-cli extension create -t destination", async () => {
  let projectBase = path.resolve(__dirname, "../../../test-projects/create-result");
  if (fs.existsSync(projectBase)) {
    fs.rmSync(projectBase, { recursive: true });
  }
  let result = await cmd(`extension create -d ${projectBase} -n testprj -j latest -t destination`);
  expect(result.exitCode).toBe(0);
  amendJson(path.resolve(projectBase, "package.json"), pkg => {
    changeDep(pkg, "@jitsu/types", "file:/" + path.resolve(__dirname, "../../jitsu-types"));
    changeDep(pkg, "@jitsu/jlib", "file:/" + path.resolve(__dirname, "../../jlib"));
    changeDep(pkg, "jitsu-cli", "file:/" + path.resolve(__dirname, "../../jitsu-cli"));
    return pkg;
  });
  expect(await exec(`npm install --force`, { dir: projectBase })).toBe(0);
  expect(await exec(`npm run build`, { dir: projectBase })).toBe(0);
  expect(await exec(`npm run test`, { dir: projectBase })).toBe(0);
  expect(await exec(`npm run validate-config -- -c "{exampleParam: true}"`, { dir: projectBase })).toBe(1);
  expect(await exec(`npm run validate-config -- -c "{exampleParam: 'valid-config'}"`, { dir: projectBase })).toBe(0);
  fs.writeFileSync(path.resolve(projectBase, "test-config.json"), "{exampleParam: 'valid-config'}");
  expect(await exec(`npm run validate-config -- -c test-config.json`, { dir: projectBase })).toBe(0);
});
