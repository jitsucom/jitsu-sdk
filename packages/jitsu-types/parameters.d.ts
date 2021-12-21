type ConfigParameterType = "string" | "int" | "json" | "boolean" | "password";

export type ConfigurationParameter = {
  /**
   * Id (corresponds to key in yaml config)
   */
  id: string;
  /**
   * Type of parameter
   */
  type: ConfigParameterType;
  /**
   * Display name (for UI)
   */
  displayName: string;
  /**
   *  Flag describes required/optional nature of the field. IF empty - field is optional
   *  Either constant or function of current config
   */
  required: boolean;
  /**
   * Default value (should be displayed by default)
   */
  defaultValue?: any;
  /**
   * Text of documentation hint in UI. Can contain HTML
   */
  documentation?: string;
};
