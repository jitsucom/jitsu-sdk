import {JitsuEvent} from "./event";
import {ConfigurationParameter} from "./parameters";

/**
 * Context data containing destinationId, destinationType
 * and provided values for DestinationDescriptor's configurationParameters
 */
export declare type DestinationContext = {
    /**
     * Unique Id of configured destination instance on Jitsu server
     */
    destinationId: string
    /**
     * Destination type id
     */
    destinationType: string
    /**
     * Values set for <b>configurationParameters</b> during destination instance setup
     */
    [key: string]: string

}

export declare type DestinationMessage = {
    url: string
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    headers?: {[key: string]: string}
    body: any
}

export declare type DestinationAdapter = (event: JitsuEvent, context: DestinationContext, ...extraArgs: any[]) => DestinationMessage[] | DestinationMessage | null;

export declare type DestinationDescriptor = {
    /**
     * Destination type id
     */
    type: string
    /**
     * Destination display name
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
    /**
     * List of configuration parameters
     */
    configurationParameters: ConfigurationParameter[]
    /**
     * Transformation code that will be set by default for new destinations.
     * Jitsu server gives <b>adapter</b> function new name derived from destination id = <code>lowerCamelCase("to" + type)</code>
     * If not provided default transform code simply passes event to adapter function. E.g. for destination with id <i>"slack"</i>
     * defaultTransform will be:
     * <code>return toSlack($, context)</code>
     */
    defaultTransform?: string

}