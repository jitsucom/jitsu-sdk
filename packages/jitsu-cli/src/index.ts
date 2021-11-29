import { run } from "./run"

(async function(): Promise<any> {
  const args = [...process.argv.slice(2)]
  process.exit(await run(args))
})()
