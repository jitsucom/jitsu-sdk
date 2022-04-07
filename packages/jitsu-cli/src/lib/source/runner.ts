import { DataRecord, SourceFunctions } from "@jitsu/types/source";

/**
 * Gets data from a particular stream. Should be used for testing and debugging purposes
 * only.
 *
 * Returns all data from stream. Do not use for large streams, the function accumulates data in
 * memory
 *
 * @param sourceConfig source config
 * @param streamConfig stream configuration
 * @param src source implementation
 */
export const getDataFromStream = async <Config = Record<string, any>>(
  sourceConfig: Config,
  streamConfig: Record<string, any>,
  src: SourceFunctions<Config>
): Promise<any[]> => {
  const data: Record<string, { val: any; expiresTimestampMs: number }> = {};
  const rows: any[] = [];
  await src.streamData(
    sourceConfig,
    streamConfig,
    {
      emmit: (record: DataRecord) => {
        rows.push(record);
      },
    },
    {
      storage: {
        get: key => {
          if (data[key] && data[key].expiresTimestampMs > Date.now()) {
            return data[key].val;
          }
        },
        set: (key, object, opts) => {
          data[key] = { val: object, expiresTimestampMs: opts?.expireInMs ?? Number.MAX_VALUE };
        },
      },
    }
  );
  return rows;
};
