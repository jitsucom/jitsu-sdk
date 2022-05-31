import { ConfigValidator } from "@jitsu/types/extension";

export async function validateConfiguration(config: any, validator: ConfigValidator): Promise<(string | undefined)> {
  try {
    const result = await validator(config);
    if (typeof result === "boolean" && !result) {
      return "Unknown error";
    } else if (typeof result === "object" && !result.ok) {
      return result.message || "Unknown error";
    } else if (typeof result === "string") {
      return result;
    }
  } catch (e: any) {
    return e?.message || "Unknown error";
  }
}
