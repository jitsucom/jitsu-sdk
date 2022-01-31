import { run } from "./run";
import getLog from "./lib/log";

(async function (): Promise<any> {
  getLog().info("Args: " + process.argv);
  const args = [...process.argv.slice(2)];
  process.exit(await run(args));
})();
