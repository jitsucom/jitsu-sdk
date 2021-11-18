



export type ConfigurationParameter<TypeSpace = string> = {
    /**
     * Display name (for UI)
     */
    displayName?: string
    /**
     * Id (corresponds to key in yaml config)
     */
    id: string
    /**
     * Type of parameter
     */
    type?: TypeSpace
    /**
     * Default value (should be displayed by default)
     */
    defaultValue?: any
    /**
     *  Flag describes required/optional nature of the field. IF empty - field is optional
     *  Either constant or function of current config
     */
    required: boolean
}