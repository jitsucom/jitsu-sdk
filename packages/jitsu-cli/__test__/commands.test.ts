import { run } from "../src/run"
import * as fs from "fs"
import path from "path"
import { spawn, spawnSync } from "child_process"
import chalk from "chalk"


async function cmd(args?: string): Promise<{ exitCode: number, stderr: string }> {
  let originalConsole = console.error
  let consoleOutput: any[] = []
  console.error = jest.fn((args) => {
    let line = Array.isArray(args) ? args.join(" ") : args
    consoleOutput.push(...line.split("\n"))
  })
  let exitCode: number
  try {
    exitCode = await run(args ? args.split(" ") : [])
    let header = `   jitsu ${args || ""}, code: ${exitCode} `
    console.info([
      chalk.bgBlue.white(header),
      ...consoleOutput.map(ln => chalk.bgBlue('  ') + ` ${ln}`),
      chalk.bgBlue(' '.repeat(header.length)),
    ].join("\n"))
  } finally {
    console.error = originalConsole
  }
  return { exitCode, stderr: consoleOutput.map(ln => `| ${ln}`).join("\n") }
}


test("jitsu", async () => {
  let result = await cmd()
  expect(result.exitCode).toBe(0)
})

test("jitsu help", async () => {
  let result = await cmd("help")
  expect(result.exitCode).toBe(0)
})

test("jitsu destination", async () => {
  let result = await cmd("destination")
  expect(result.exitCode).toBe(0)
})

test("jitsu destination help", async () => {
  let result = await cmd("destination help")
  expect(result.exitCode).toBe(0)
})

async function wait(childProcess): Promise<number> {
  return new Promise((resolve, reject) => {
    childProcess.on("exit", (exitCode) => resolve(exitCode))
  })
}

function summary(cmd, cmdResult) {
  let stderrStr = cmdResult.stderr?.toString()
  let stdoutStr = cmdResult.stdout?.toString()
  const lines = [
    chalk.bgBlue.white(" EXEC:  " + cmd + " => " + cmdResult.status + " "),
    ...(stdoutStr?.length > 0 ? stdoutStr.split("\n").map(ln => chalk.bgBlue.white(" stdout ") + " " + ln) : [null]),
    ...(stderrStr?.length > 0 ? stderrStr.split("\n").map(ln => chalk.bgBlue.red(" stderr ") + " " + ln) : [null]),
  ].filter(el => el !== null)
  console.info(lines.join("\n"))
}

async function exec(cmd: string, opts: { dir?: string } = {}) {
  let cmdResult = await spawnSync(cmd, { cwd: opts.dir || ".", shell: true })
  summary(cmd, cmdResult)
  return cmdResult.status
}

// test("jitsu destination create", async () => {
//   let projectBase = path.resolve(__dirname, "../../../test-projects/create-result")
//   let result = await cmd("destination create " + projectBase);
// });

test("jitsu destination build & test", async () => {
  let projectBase = path.resolve(__dirname, "../../../test-projects/destination")
  let dist = path.resolve(projectBase, "dist/test-destination.js")
  if (fs.existsSync(dist)) {
    fs.unlinkSync(dist)
  }
  expect(await exec(`npm i && npm i ${path.resolve(__dirname, "..")}`, { dir: projectBase })).toBe(0)
  expect(await exec(`npm run build`, { dir: projectBase })).toBe(0)
  let content = fs.readFileSync(dist).toString()
  expect(content.length).toBeGreaterThan(1);
  expect(await exec(`npm run test`, { dir: projectBase })).toBe(0)
})

