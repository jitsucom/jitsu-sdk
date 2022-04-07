import { JitsuEvent } from "./event"
import { ConfigurationParameter, PluginMeta } from "./parameters"

/**
 * Context data containing destinationId, destinationType
 * and provided values for DestinationDescriptor's configurationParameters
 */
export declare type JitsuContext = {
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
  [key: string]: any
}

export declare type DestinationMessage = {
  url: string
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  headers?: { [key: string]: string }
  body: any
}

export declare type DestinationAdapter = (
  event: JitsuEvent,
  context: JitsuContext,
  ...extraArgs: any[]
) => DestinationMessage[] | DestinationMessage | null

export declare type DestinationDescriptor =  PluginMeta & {
  /**
   * List of configuration parameters
   */
  configurationParameters: ConfigurationParameter[]
}
