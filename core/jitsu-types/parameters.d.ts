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

type ConfigParameterType =
  | "string"
  | "int"
  | "json"
  | "boolean"
  | "password"
  // | { oneOf: string[] } // not implemented
  // | { severalOf: string[]; max?: number } // not implemented
  | ConfigParameterSelection; // not implemented

type ConfigParameterSelection = {
  options: ConfigParameterSelectionOption[];
  /**
   * Maximum options allowed to be selected. Undefined means there's no limit in number of possible
   * selected fields
   */
  maxOptions?: number;
};

type ConfigParameterSelectionOption = {
  id: string;
  displayName: string;
};
