export type PluginMeta = {
  /**
   * Plugin (destination or source) id
   */
  type: string
  /**
   * Display name
   */
  displayName: string
  /**
   * Description. Can contain HTML
   */
  description: string
  /**
   * Can be either URL to PNG or SVG image or HTML string containing SVG
   */
  icon?: string
}


export type ConfigurationParameter = {
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
};
