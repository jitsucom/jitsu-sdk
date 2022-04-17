/**
 * A special keys that contains a cue how certain key
 * should be serialized to DB. Examples of such cues:
 *  - If subtree should be flattened
 *  - SQL type of the column
 */
import { ConfigurationParameter } from "./parameters";
import { SqlTypeHint, SqlTypeHintKey } from "./sql-hints";

declare type JitsuDataMessageType = "record" | "clear_stream" | "delete_records" | "new_transaction" | "change_state";

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
 * Command to delete data based on parameter conditions, see "delete_records" message
 */
declare type DeleteRecords = {
  whenConditions: Condition;
};

/**
 * SQL Condition for clearing the data, see
 */
declare type Condition = {
  /**
   * Condition expression. Use placeholders instead of values
   */
  expression: string;
  /**
   * Condition values, placeholders for ?
   */
  values: any[];
};

declare type StreamConfigurationParameters<StreamConfig = Record<string, any>> = {
  streamName: string;
  mode?: StreamSyncMode;
  params?: ConfigurationParameter<keyof StreamConfig>[];
};

declare type StreamConfiguration<StreamConfig = Record<string, any>> = {
  /**
   * 'incremental' is a default value
   */
  mode?: StreamSyncMode;
  params: StreamConfig;
};

declare type JitsuDataMessage<T extends JitsuDataMessageType, P> = {
  type: T;
  message?: P;
};

/**
 * Adds a record to an underlying stream. Records are UPSERT'ed, meaning that
 * the record with same id will be replaced. Id is DataRecord.__id
 */
declare type AddRecordMessage = JitsuDataMessage<"record", DataRecord>;
/**
 * Clears underlying table. Removes all records. Equivalent of 'TRUNCATE TABLE'
 */
declare type ClearStreamMessage = JitsuDataMessage<"clear_stream", never>;
/**
 * Delete records based on condition
 */
declare type DeleteRecordsMessage = JitsuDataMessage<"delete_records", DeleteRecords>;
/**
 * Starts a new transaction. There's no corresponding endTransaction calls.
 *
 *  - New translation call will commit previous transaction (if any)
 *  - At the end of streaming cycle current transaction will be committed
 *
 */
declare type NewTransactionMessage = JitsuDataMessage<"new_transaction", never>;

/**
 * To signal executor save a certain data to 'state'. See stdout-streamer.ts.
 *
 * Don't us it directly, it's an internal message
 */
declare type ChangeStateMessage = JitsuDataMessage<
  "change_state",
  {
    key: string;
    value: any;
    //set to negative to delete the key, undefined means the key never expires
    expireMs?: number;
  }
>;

declare type StreamSink = {
  /**
   * Sends message to the sink. See types of messages above
   */
  msg<T extends JitsuDataMessageType, P>(msg: JitsuDataMessage<T, P>);

  /**
   * Adds data record to stream. Alias for msg({type: "record",  message: record})
   * @param record record
   */
  addRecord(record: DataRecord);
  /**
   * Alias for ClearStreamMessage
   */
  clearStream();

  /**
   * Alias for NewTransactionMessage
   */
  newTransaction();

  /**
   * Alias for DeleteRecordsMessage
   */
  deleteRecords(condition: string, values: any[] | any);
};

declare type SourceCatalog<Config = Record<string, any>, StreamConfig = Record<string, any>> = (
  config: Config
) => Promise<StreamConfigurationParameters<StreamConfig>[]>;

declare type StreamReader<Config = Record<string, any>, StreamConfig = Record<string, any>> = (
  sourceConfig: Config,
  streamName: string,
  streamConfiguration: StreamConfiguration<StreamConfig>,
  streamSink: StreamSink,
  services: { state: StateService }
) => Promise<void>;

/**
 * Axillary services for saving state, a permanent values that are accessible
 * between runs.
 */
declare type StateService = {
  get(key: string): any;
  set(key: string, object: any, opts: { expireInMs?: number });
};
