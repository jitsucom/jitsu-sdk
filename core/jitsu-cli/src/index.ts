import { cliEntryPoint } from "./cli/cli";

(async function (): Promise<any> {
  process.exit(await cliEntryPoint(process.argv.slice(2)));
})();
