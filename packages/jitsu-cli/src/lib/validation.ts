import { ConfigValidator } from "@jitsu/types/extension";

export async function validateConfiguration<Config>(
  config: Config,
  validator: ConfigValidator
): Promise<string | undefined> {

  let validationResult;
  try {
    validationResult = await validator(config);
  } catch (e: any) {
    return e?.message || 'Unknown exception'
  }

  if (validationResult === true) {
    return undefined;
  }
  if (typeof validationResult === "string") {
    return validationResult;
  }
  if (typeof validationResult === "object" && !validationResult.ok) {
    return validationResult.message ?? "Unknown error";
  }
  return undefined;
}
