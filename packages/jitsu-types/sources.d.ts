/**
 * A special keys that contains a cue how certain key
 * should be serialized to DB. Examples of such cues:
 *  - If subtree should be flattened
 *  - SQL type of the column
 */
import { ConfigurationParameter } from "./parameters";
import { SqlTypeHint, SqlTypeHintKey } from "./sql-hints";

declare type JitsuDataMessageType = "record" | "clear_stream" | "delete_records" | "new_transaction";

/**
 * full_sync – each sync clears the destination table and reprocesses all the data
 * incremental – each sync appends data to the destination table or modify data in the sync window. StateService is used to remember sync position
 */
declare type StreamSyncMode = "full_sync" | "incremental";

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

/**
 * Command to delete data based on parameter conditions
 */
declare type DeleteRecords = {
  whenConditions: WhenCondition[];
};

/**
 * Parameter condition that will transform to simple SQL expressions
 */
declare type WhenCondition = {
  parameter: string;
  condition: "=" | ">" | "<" | "<>" | ">=" | "<=" | "is null" | "is not null";
  value?: any;
};

declare type StreamConfigurationParameters<StreamConfig = Record<string, any>> = {
  streamName: string;
  mode?: StreamSyncMode;
  params?: ConfigurationParameter<keyof StreamConfig>[];
};

declare type StreamConfiguration<StreamConfig = Record<string, any>> = {
  mode?: StreamSyncMode;
  params: StreamConfig;
};

declare type JitsuDataMessage<T extends JitsuDataMessageType, P> = {
  type: T;
  message?: P;
};

declare type StreamSink = {
  /**
   * Sends message to the sink. Low level method
   * @param msg
   */
  msg<T extends JitsuDataMessageType, P>(msg: JitsuDataMessage<T, P>);

  /**
   * Adds data record to stream. TODO: ??? Replaces record with a same ID
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
  streamConfiguration: StreamConfiguration<StreamConfig>,
  streamSink: StreamSink,
  services: { state: StateService }
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

/**
 * Axillary services for saving state, a permanent values that are accessible
 * between runs.
 */
declare type StateService = {
  get(key: string): any;
  set(key: string, object: any, opts: { expireInMs?: number });
};
