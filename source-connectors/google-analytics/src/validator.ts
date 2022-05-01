import type { ConfigValidationResult } from "@jitsu/types/extension";

export const googleAnalyticsValidator = async (config: GoogleAnalyticsConfig): Promise<ConfigValidationResult> => {
  return true;
};
