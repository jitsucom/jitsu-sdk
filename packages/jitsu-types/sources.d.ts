/**
 * A special keys that contains a cue how certain key
 * should be serialized to DB. Examples of such cues:
 *  - If subtree should be flattened
 *  - SQL type of the column
 */
import { ConfigurationParameter } from "./parameters";
import { ExtensionDescriptor, JitsuExtensionExport } from "./extension";
import { SqlTypeHint, SqlTypeHintKey } from "./sql-hints";

declare type JitsuDataMessageType = "record" | "chunk_start" | "bookmark";

/**
 * full_sync – each sync clears the destination table and reprocesses all the data
 * incremental – each sync only appends data to the destination table. BookmarkService is used to remember sync position
 * chunked – data is split in chunks based on key parameter (typically based on date). for services that may retrospectively update data that was already synced.
 * each sync destination data is cleared and reprocessed independently for each processed chunk
 * E.g. for Google Analytics it makes sense to always reprocess last 30 days of data due to conversion attribution
 */
declare type StreamSyncMode = "full_sync" | "incremental" | "chunked";

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
 * Represent saved state of synced stream. E.g. lost synced row id.
 */
declare type Bookmark = Record<string, any>;

/**
 * For streams in mode=chunked indicates start of the chunk.
 * All following JitsuDataMessage-s with type=record must belong to that chunk.
 * Chunk ends when another chunk starts or when there is no more messages in StreamSink
 */
declare type Chunk = {
  /**
   * Key of the chunk.
   * Jitsu deletes all previous records for the chunk based on key value
   * before starting processing new records
   */
  key: string;
  /**
   * Indicate that all records for this chunk must be processed in a single transaction
   */
  transactional?: boolean;

  /**
   * Optional. chunk_parameter tell what record parameter what used to split records on chunks
   */
  chunkParameter?: string;
  /**
   * Optional. If chunk represents interval - indicate what chunk_parameter value is used as a start of interval (inclusive)
   */
  intervalFrom?: any;
  /**
   * Optional. If chunk represents interval - indicate what chunk_parameter value is used as an end of interval (exclusive)
   */
  intervalTo?: any;
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

/**
 * Axillary services for leaving 'bookmarks', a permanent values that are accessible
 * between runs.
 */
declare type BookmarkService = {
  get(key: string): any;
  set(key: string, object: any, opts: { expireInMs?: number });
};

declare type JitsuDataMessage<T extends JitsuDataMessageType, P> = {
  type: T;
  message: P;
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

  /**
   * Starts new chunk of records. See {@link Chunk}
   */
  startChunk(chunk: Chunk);

  /**
   * Prints bookmark to the StreamSink. See {@link Bookmark}
   */
  saveBookmark(bookmark: Bookmark);
};

declare type GetAllStreams<Config = Record<string, any>, StreamConfig = Record<string, any>> = (
  config: Config
) => Promise<StreamConfigurationParameters<StreamConfig>[]>;

declare type Streamer<Config = Record<string, any>, StreamConfig = Record<string, any>> = (
  sourceConfig: Config,
  streamName: string,
  streamConfiguration: StreamConfiguration<StreamConfig>,
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
