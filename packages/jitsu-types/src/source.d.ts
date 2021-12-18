/**
 * A special keys that contains a cue how certain key
 * should be serialized to DB. Examples of such cues:
 *  - If subtree should be flattened
 *  - SQL type of the column
 */
import { ConfigurationParameter, PluginMeta } from "./parameters"

declare type DataCueKey = `__$data_cue_${string}`

declare type SqlTypeCue = string | Record<string, string>

declare type DataCue = { sql: SqlTypeCue }

declare type DataRecord = {
  [cue: DataCueKey]: DataCue
  [propName: string]: any
}

/**
 * Definition of Jitsu pull source. Pull source is a piece of code
 * that pulls data from external API, converts it to Jitsu native format
 * and sends
 */
declare type PullSourceMeta = PluginMeta & {
  /**
   * List of configuration parameters
   */
  configurationParameters: ConfigurationParameter[]
}

declare type PullSourceConfiguration = {
  meta: PullSourceMeta
  config: any
}

declare type StreamConfiguration = {
  streamName: string
  configParams: StreamConfigurationParameters
  config: any
}

declare type StreamConfigurationParameters = {
  params: ConfigurationParameter[]
}

declare type PermanentStorage = {
  get(key: string): any
  set(key: string, object: any, opts: { expireInMs?: number })
}

declare type PullSourceExecutor = {
  getAllStreams: (meta: PullSourceMeta) => Promise<Record<string, StreamConfigurationParameters>>
  checkConnection: (meta: PullSourceMeta) => Promise<{ ok: boolean; msg?: string }>
  streamData: (
    sourceConfig: PullSourceConfiguration,
    streamConfig: StreamConfigurationParameters,
    services: { storage: PermanentStorage }
  ) => Generator<DataRecord, any, number>
}
