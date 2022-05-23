/**
 * This file contains definitions for sources connector.
 *
 * "Source" (aka "connector", aka "source connector") is an external dataset. Jitsu
 * pulls data from "source" and puts to destination database. Examples of sources are:
 *  - Non-relational databases (Redis, Firestore, Firebase Auth)
 *  - Services with APIs (Airtable, Google Sheets, Google Analytics)
 *
 *
 * Source is represented by:
 *
 *  - Configuration (see Config template parameter). Configuration usually contains credentials (example: Redis login password)
 *  - Streams (aka collections). Each stream will be mapped to a table in destination. Each source might expose multiple stream.
 *    Example, firebase exposes two streams: users, and firestore. Stream has a unique name
 *  - Stream configuration (see StreamConfiguration template variable). Stream might be configurable. Example: firebase 'users'
 *    is not configurable stream, but firestore is parameterized by collection (equivalent to table in SQL terms)
 *  - A pair of stream and it's configuration makes a "stream instance"
 *  - Each stream can have multiple instances
 *  - Each stream instance will be mapped to a table in destination database
 *
 *  Source also is represented by functions, which define a business logic of working with underlying API or database. The
 *  types of functions are (see typedefs below)
 *   - ConfigValidator — validates source configuration. This type is shared with other types of extensions (see extension.d.ts
 *   - SourceCatalog - returns a list of stream instances (based on source configuration)
 *   - StreamReader - reads data from stream and sends data as a set of records, which will be added to destination database
 */
import { ConfigurationParameter } from "./parameters";
import { SqlTypeHint, SqlTypeHintKey } from "./sql-hints";

declare type JitsuDataMessageType = "record" | "clear_stream" | "delete_records" | "new_transaction" | "state" | "log";

declare type JitsuLogLevel = "INFO" | "WARN" | "DEBUG" | "ERROR";

/**
 * full_sync – each sync clears the destination table and reprocesses all the data
 * incremental – each sync appends data to the destination table or modify data in the sync window. StateService is used to remember sync position
 */
declare type StreamSyncMode = "full_sync" | "incremental";

/**
 * DataRecord represents data object that Jitsu will send to a destination.
 * Jitsu may apply additional transforms and type mappings before saving object to a destination, e.g.:
 * for SQL based data warehouse Jitsu will flatten hierarchical object structure to a single row object
 * while __id field value will be used to fill eventn_ctx_event_id primary key
 */
declare type DataRecord = {
  /**
   * Unique id of the record. The id of the same record should persist between run
   * Jitsu runs deduplication based on this record.
   *
   * If uniqueId cannot be obtained naturally, please use buildSignatureId() helper function (TODO: implement)
   * that builds ID based on sorted field values of the record
   */
  $id: string;
  /**
   * Datetime associated with record. It may be entity creation of modification date
   * or date of reporting data raw.
   *
   * For sources that refresh data for specific time window it is important to fill this parameter.
   * and use DeleteRecord message to clear old rows before adding fresh data.
   */
  $recordTimestamp?: Date;
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

declare type LogRecord = {
  level: JitsuLogLevel;
  message: string;
};

/**
 * Command to delete data based on $recordTimestamp value.
 * Date range to delete is calculated based on partitionTimestamp and granularity using calendar rules
 * E.g. for partitionTimestamp = "2022-05-23T16:08:41.212Z" and granularity = "MONTH"
 * will be deleted data with $recordTimestamp between 2022-05-01 and 2022-05-31 23:59:59.999
 */
declare type DeleteRecords = {
  partitionTimestamp: Date;
  granularity: Granularity;
};

declare type Granularity = "HOUR" | "DAY" | "MONTH" | "QUARTER" | "YEAR";

declare type StreamInstance<StreamConfig = Record<string, any>> = {
  type: string;
  supportedModes?: StreamSyncMode[];
  params?: ConfigurationParameter<keyof StreamConfig>[];
};

declare type StreamConfiguration<StreamConfig = Record<string, any>> = {
  /**
   * 'incremental' is a default value
   */
  mode?: StreamSyncMode;
  parameters: StreamConfig;
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

declare type LogMessage = JitsuDataMessage<"log", LogRecord>;
/**
 * Clears underlying table. Removes all records. Equivalent of 'TRUNCATE TABLE'
 * ClearStreamMessage may be used only in the first transaction for stream and must precede any AddRecordMessage
 */
declare type ClearStreamMessage = JitsuDataMessage<"clear_stream", never>;
/**
 * Delete records based on condition. Delete message must precede any AddRecordMessage in transaction
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
declare type StateMessage = JitsuDataMessage<"state", Record<string, any>>;

declare type StreamSink = {
  /**
   * Sends message to the sink. See types of messages above
   */
  msg<T extends JitsuDataMessageType, P>(msg: JitsuDataMessage<T, P>);

  log(level: JitsuLogLevel, message: string);
  /**
   * Adds data record to stream. Alias for msg({type: "record",  message: record})
   * @param record record
   */
  addRecord(record: DataRecord);
  /**
   * Report that persistent state was changed and provide an object representing current state.
   */
  changeState(newState: Record<string, any>);
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
  deleteRecords(partitionTimestamp: Date, granularity: Granularity);
};

declare type SourceCatalog<Config = Record<string, any>, StreamConfig = Record<string, any>> = (
  config: Config
) => Promise<StreamInstance<StreamConfig>[]>;

/**
 * The main function that pulls data and convert it to the messages send to streamSink.
 */
declare type StreamReader<Config = Record<string, any>, StreamConfig = Record<string, any>> = (
  sourceConfig: Config,
  streamType: string,
  streamConfiguration: StreamConfiguration<StreamConfig>,
  streamSink: StreamSink,
  services: { state: StateService }
) => Promise<void>;

/**
 * (For future implementation) function that is called when source triggers a webhook, and the
 * webhook request handled by Jitsu. Webhooks can be handled on global (source) level or on a stream
 * level. Depending on that config.stream can be undefined
 */
declare type WebHookHandler<Config = Record<string, any>, StreamConfig = Record<string, any>> = (
  config: {
    source: Config;
    stream?: StreamConfig;
  },
  webhook: {
    //header names are lower-cased
    headers: Record<string, string>;
    body: string;
    //if hook sends json, the parsed body will be here
    json?: any;
  },
  streamSink: StreamSink,
  services: { state: StateService }
) => Promise<void>;

/**
 * Axillary services for saving state, a permanent values that are accessible
 * between runs.
 */
declare type StateService = {
  get(key: string): any;
  set(key: string, object: any);
};
