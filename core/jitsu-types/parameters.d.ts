export type ConfigurationParameter<T = string> = {
  /**
   * Id (corresponds to key in yaml config)
   */
  id: T;
  /**
   * Type of parameter
   *
   * Default is 'string'
   */
  type?: ConfigParameterType;
  /**
   * Display name (for UI)
   */
  displayName: string;
  /**
   *  Flag describes required/optional nature of the field. IF empty - field is optional
   *  Either constant or function of current config
   *
   *  Not required if not set
   */
  required?: boolean;
  /**
   * Default value (should be displayed by default)
   */
  defaultValue?: any;
  /**
   * Text of documentation hint in UI. Can contain HTML
   */
  documentation?: string;
  /**
   * Defines if the field can be accepted depending on the parent field value
   */
  relevantIf?: {
    /** Parent field id */
    field: string;
    /** Parent field value for which this field is relevant */
    value: unknown;
  };
};

export type ConfigParameterType =
  | "string"
  | "int"
  | "json"
  | "boolean"
  | "password"
  | "isoUtcDate" // not yet implemented by the extension runner engine
  | { oneOf: Readonly<string[]> } // not yet implemented by the extension runner engine and front-end
  | { severalOf: Readonly<string[]>; max?: number }; // not yet implemented by the extension runner engine and front-end 
