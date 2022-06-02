import { SourceCatalog, StateService, StreamReader, StreamSink, StreamConfiguration } from "@jitsu/types/sources";
import { ConfigValidationResult, ExtensionDescriptor } from "@jitsu/types/extension";
import { createClient } from "redis";

export interface RedisConfig {
  host: string;
  port: string;
  dbNumber?: number;
  secure?: boolean;
  password?: string;
  username?: string;
}

export interface HashStreamConfig {
  redis_key?: string;
}

const descriptor: ExtensionDescriptor<RedisConfig> = {
  id: "redis",
  displayName: "Redis Source",
  description: "Pulls data from Redis database",
  configurationParameters: [
    {
      id: "host",
      displayName: "Redis host",
      documentation: "Redis host",
      required: true,
    },
    {
      id: "port",
      displayName: "Redis Port",
      defaultValue: 6379,
      documentation: "Redis port (6379 by default)",
      required: true,
    },
    {
      id: "password",
      type: "password",
      displayName: "Redis Password",
      documentation: "Not required if redis auth is not configured",
      required: false,
    },
  ],
};

function buildUrl(config: RedisConfig) {
  return [
    config.secure ? "rediss" : "redis",
    "://",
    config.password && `${config.username || ""}:${config.password}@`,
    config.host,
    ":",
    config.port || 6379,
    config.dbNumber && `/${config.dbNumber}`,
  ]
    .filter(el => !!el)
    .join("");
}

async function connect(config: RedisConfig) {
  let url = buildUrl(config);
  console.log("Connecting to redis: " + url + "...");
  let client = createClient({ url });
  await client.connect();
  console.log("Connected!");
  return client;
}

async function validator(config: RedisConfig): Promise<ConfigValidationResult> {
  const redis = await connect(config);
  try {
    await redis.ping();
  } finally {
    await redis.disconnect();
  }

  return true;
}

const sourceCatalog: SourceCatalog<RedisConfig, HashStreamConfig> = async (config: RedisConfig) => {
  return [
    {
      type: "hash",
      supportedModes: ["full_sync"],
      params: [
        {
          id: "redis_key",
          displayName: "Redis Key. Empty value is equivalent of '*'",
          documentation:
            "Read how to get table id: https://support.airtable.com/hc/en-us/articles/4405741487383-Understanding-Airtable-IDs",
          required: true,
        },
      ],
    },
  ];
};

type Maybe<T> = T | undefined | null;

function jsonOrString(value: Maybe<string>, ifString: (s: Maybe<string>) => any = s => s) {
  if (!value) {
    return ifString(value);
  }
  try {
    const parsed = JSON.parse(value);
    if (parsed == value) {
      //not an object but single value
      return ifString(value);
    }
    return parsed;
  } catch (e) {
    return ifString(value);
  }
}

async function processRedisKey(key: string, redis, streamSink) {
  let keyType = await redis.type(key);
  switch (keyType) {
    case "string":
      let value = await redis.get(key);
      if (value) {
        addRecord(
          streamSink,
          key,
          null,
          jsonOrString(value, value => ({ value }))
        );
      }
      break;
    case "list":
      (await redis.lRange(key, 0, -1)).forEach((value, index) => {
        addRecord(
          streamSink,
          key,
          null,
          jsonOrString(value, value => ({ value }))
        );
      });
      break;
    case "set":
    case "zset":
      (await redis.sMembers(key)).forEach((value, index) => {
        addRecord(
          streamSink,
          key,
          null,
          jsonOrString(value, value => ({ value }))
        );
      });
      break;
    case "hash":
      let cursor = 0;
      while (true) {
        let scanResult = await redis.hScan(key, cursor);
        for (const { field, value } of scanResult.tuples) {
          addRecord(
            streamSink,
            key,
            field,
            jsonOrString(value, value => ({ value }))
          );
        }
        cursor = scanResult.cursor;
        if (cursor === 0) {
          break;
        }
      }

      break;
    case "stream":
      throw new Error(`Key ${key} has type of STREAM. Streams are not supported`);
  }
}

function formatNum(num: number): string {
  return num.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

const redisScanCount = 50000;
const streamReader: StreamReader<RedisConfig, HashStreamConfig> = async (
  sourceConfig: RedisConfig,
  streamType: string,
  streamConfiguration: StreamConfiguration<HashStreamConfig>,
  streamSink: StreamSink
) => {
  const redis = await connect(sourceConfig);
  try {
    let redisKeyPattern = streamConfiguration.parameters.redis_key || "*";
    if (redisKeyPattern.indexOf("*") >= 0) {
      let keys = await redis.dbSize();
      streamSink.log("INFO", `Going to scan through ${formatNum(keys)}, matching pattern '${redisKeyPattern}'`);
      let cursor = 0;
      let scanIterations = 0;
      while (true) {
        let scanRes = await redis.scan(cursor, { MATCH: redisKeyPattern, COUNT: redisScanCount });
        scanIterations++;
        if (scanRes.keys.length > 0) {
          streamSink.newTransaction();
          streamSink.log(
            "INFO",
            `Scanned ${formatNum(Math.min(scanIterations * redisScanCount, keys))} / ${formatNum(
              keys
            )} keys (${formatNum(((scanIterations * redisScanCount) / keys) * 100)}%). Got ${scanRes.keys.length} keys`
          );
          for (const key of scanRes.keys) {
            await processRedisKey(key, redis, streamSink);
          }
        } else {
          streamSink.log(
            "INFO",
            `Scanned ${formatNum(Math.min(scanIterations * redisScanCount, keys))} / ${formatNum(
              keys
            )} keys (${formatNum(((scanIterations * redisScanCount) / keys) * 100)}%). Got ${scanRes.keys.length} keys`
          );
        }
        cursor = scanRes.cursor;
        if (cursor === 0) {
          break;
        }
      }
    } else {
      streamSink.log("INFO", `Running GET ${redisKeyPattern}`);
      await processRedisKey(redisKeyPattern, redis, streamSink);
    }
  } finally {
    await redis.disconnect();
  }
};

function addRecord(sink: StreamSink, redisKey: string, redisHash: string | null, object: any) {
  sink.addRecord({
    ...object,
    $id: redisHash ? redisKey + "/" + redisHash : redisKey,
    redis_key: redisKey,
    redis_hash: redisHash,
  });
}

export { sourceCatalog, streamReader, descriptor, validator };
