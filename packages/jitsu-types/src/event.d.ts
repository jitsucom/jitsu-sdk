/**
 * User properties (ids).
 */
export interface UserProperties {
    anonymous_id?: string             //anonymous is (cookie or ls based),
    id?: string                       //user id (non anonymous). If not set, first known id (from propName below) will be used
    email?: string                    //user email
    [propName: string]: any           //any other forms of ids
}

/**
 * Location data. Enriched by Jitsu server.
 */
export interface Location {
    country?: string
    region?: string
    city?: string
    latitude?: number
    longitude?: number
}

/**
 * UserAgent data. Parsed by Jitsu server
 */
export interface UserAgent {
    ua_family?: string
    ua_version?: string
    os_family?: string
    os_version?: string
    device_family?: string
    device_brand?: string
    device_model?: string
    bot?: boolean
}

/**
 * Ids for third-party tracking systems
 */
export type ThirdpartyIds = {
    [id: string]: string
}

export type Conversion = {
    //The purpose of this set is mainly to mimic GA's set of parameters
    //(see https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters)

    transaction_id?: string | number  //id of transaction
    affiliation?: string | number     //affiliation id
    revenue?: number                  //revenue
    currency?: string                 //currency
    shipping_cost?: number            //shipping cost
    tax?: number                      //tax cost
    [propName: string]: any
}

/**
 * Event object
 */
export type JitsuEvent = {
    event_type: string               //event type
    source_ip?: string               //IP address. Do not set this field on a client side, it will be rewritten on the server
    anon_ip?: string                 //First 3 octets of an IP address. Same as IP - will be set on a server
    api_key?: string                  //JS api key
    src?: string                      //Event source

    event_id?: string                 //unique event id or empty string for generating id on the backend side
    user?: UserProperties                  //user properties
    ids?: ThirdpartyIds              //user ids from external systems
    location?: Location             //Location data. Enriched by Jitsu server.
    parsed_ua?: UserAgent            //UserAgent data. Parsed by Jitsu server
    user_agent?: string               //user
    utc_time?: string                 //current UTC time in ISO 8601
    local_tz_offset?: number          //local timezone offset (in minutes)
    referer?: string                  //document referer
    url?: string                      //current url
    page_title?: string               //page title
                                     //see UTM_TYPES for all supported utm tags
    doc_path?: string                 //document path
    doc_host?: string                 //document host
    doc_search?: string               //document search string
    screen_resolution?: string        //screen resolution
    vp_size?: string                  //viewport size
    user_language?: string            //user language

    doc_encoding?: string

    utm?: Record<string, string>      //utm tags (without utm prefix, e.g key will be "source", not utm_source. See
    click_id?: Record<string, string> //all external click ids (passed through URL). See CLICK_IDS for supported all supported click ids

    conversion?: Conversion
    src_payload?: any

    [propName: string]: any
}
