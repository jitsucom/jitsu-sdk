import {JitsuEvent} from "./event";
import {ConfigurationParameter} from "./parameters";

export declare type DestinationMessage = {
    path: string
    method: 'POST'
    body: any
}

export declare type DestinationAdapter = (event: JitsuEvent) => DestinationMessage[] | DestinationMessage;

export declare type DestinationDescriptor = {
    /**
     * Destination name
     */
    name: string
    /**
     * Destination. Can contain HTML
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
}