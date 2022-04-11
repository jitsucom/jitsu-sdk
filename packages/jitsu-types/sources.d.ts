/**
 * A special keys that contains a cue how certain key
 * should be serialized to DB. Examples of such cues:
 *  - If subtree should be flattened
 *  - SQL type of the column
 */
import { ConfigurationParameter } from "./parameters";
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
  __id: string;
  /**
   * Each field may have an optional SQL type hint to help
   * executor to create SQL table column and properly convert the value
   */
  [hints: SqlTypeHintKey]: SqlTypeHint;
  /**
   * Values. Nested values are not allowed
   */
  [propName: string]: any;
};

declare type StreamConfigurationParameters<StreamConfig = Record<string, any>> = {
  streamName: string;
  params?: ConfigurationParameter<keyof StreamConfig>[];
};

/**
 * Axillary services for leaving 'bookmarks', a permanent values that are accesibble
 * between runs.
 */
declare type BookmarkService = {
  get(key: string): any;
  set(key: string, object: any, opts: { expireInMs?: number });
};

declare type JitsuDataMessageType = "add_record" | "clear_stream" | "remove";

declare type JitsuDataMessage<T extends JitsuDataMessageType, P> = {
  messageType: T;
  message: P;
};

declare type AddMessage = JitsuDataMessage<"add_record", DataRecord>;

declare type StreamSink = {
  /**
   * Sends message to the sink. Low level method
   * @param msg
   */
  msg<T extends JitsuDataMessageType, P>(msg: JitsuDataMessage<T, P>);

  /**
   * Adds data record to stream. Replaces record with a same ID
   * @param record record
   */
  addRecord(record: DataRecord);
};

declare type GetAllStreams<Config = Record<string, any>, StreamConfig = Record<string, any>> = (
  config: Config
) => Promise<StreamConfigurationParameters<StreamConfig>[]>;

declare type Streamer<Config = Record<string, any>, StreamConfig = Record<string, any>> = (
  sourceConfig: Config,
  streamName: string,
  streamConfig: StreamConfig,
  streamSink: StreamSink,
  services: { bookmarks: BookmarkService }
) => Promise<void>;
/**
 * A source extension
 */
declare type SourceFunctions<Config = Record<string, any>, StreamConfig = Record<string, any>> = {
  /**
   * Returns all available streams with configuration parameters
   *
   *
   */
  getAllStreams: GetAllStreams<Config>;
  /**
   * Runs
   * @param sourceConfig
   * @param streamConfig
   * @param streamSink
   * @param services
   */
  streamer: Streamer<Config, StreamConfig>;
};
