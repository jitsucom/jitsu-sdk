import { ConfigValidationResult, ConfigValidator } from "@jitsu/types/extension";

export function validationResultToError(validationResult: ConfigValidationResult) {
  if (typeof validationResult === "boolean" && !validationResult) {
    return "Config is not valid, an exact reason isn't specified by validator";
  } else if (typeof validationResult === "string") {
    return "Config is not valid: " + validationResult;
  } else if (typeof validationResult === "object" && !validationResult.ok) {
    return "Config is not valid: " + validationResult.message;
  }
  return undefined
}

export async function validateConfiguration(config: any, validator: ConfigValidator): Promise<(string | undefined)> {
  let validationResult = await validator(config);
  return validationResultToError(validationResult);
}
