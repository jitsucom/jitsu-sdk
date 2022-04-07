/**
 * A special keys that contains a cue how certain key
 * should be serialized to DB. Examples of such cues:
 *  - If subtree should be flattened
 *  - SQL type of the column
 */
import { ConfigurationParameter, } from "./parameters"
import { ExtensionDescriptor, JitsuExtensionExport } from "./extension";
import { SqlTypeHint, SqlTypeHintKey } from "./sql-hints";


declare type DataRecord = {
  /**
   * Unique id of the record. The id of the same record should persist between run
   * Jitsu runs deduplication based on this record.
   *
   * If uniqueId cannot be obtained naturally, please use buildSignatureId() helper function (TODO: implement)
   * that builds ID based on sorted field values of the record
   */
  uniqueId: string
  /**
   * Each field may have an optional SQL type hint to help
   * executor to create SQL table column and properly convert the value
   */
  [hints: SqlTypeHintKey]: SqlTypeHint
  /**
   * Values. Nested values are not allowed
   */
  [propName: string]: any
}


declare type StreamConfigurationParameters = {
  streamName: string
  params?: ConfigurationParameter[]
}

declare type PermanentStorage = {
  get(key: string): any
  set(key: string, object: any, opts: { expireInMs?: number })
}

declare type StreamSink = {
  emmit(record: DataRecord)
}

/**
 * A source extension
 */
declare type SourceFunctions<Config = Record<string, any>> = {
  /**
   * Config of the source. Returns all streams with configuration parameter
   * per each stream
   */
  getAllStreams: (config: Config) => Promise<StreamConfigurationParameters[]>
  streamData: (
    sourceConfig: Config,
    streamConfig: Record<string, any>,
    streamSink: StreamSink,
    services: { storage: PermanentStorage }
  ) => Promise<void>
}
