import {
  GetAllStreams,
  StateService,
  SourceFunctions,
  Streamer,
  StreamSink,
  StreamConfiguration,
} from "@jitsu/types/sources";
import { ConfigValidationResult, ExtensionDescriptor } from "@jitsu/types/extension";
import { createClient } from "redis";
import JSON5 from "JSON5";
import getLog from "jitsu-cli/lib/lib/log";

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

const getAllStreams: GetAllStreams<RedisConfig, HashStreamConfig> = async (config: RedisConfig) => {
  return [
    {
      streamName: "hash",
      mode: "full_sync",
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

function flatten(obj: any, path: string[] = []) {
  if (typeof obj !== "object") {
    throw new Error(`Can't flatten an object, expected object, but got" ${typeof obj}: ${obj}`);
  }
  if (Array.isArray(obj)) {
    return obj;
  }
  const res = {};

  for (let [key, value] of Object.entries(obj)) {
    key = key.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    if (typeof value === "object" && !Array.isArray(value)) {
      Object.entries(flatten(value, [...path, key])).forEach(
        ([subKey, subValue]) => (res[key + "_" + subKey] = subValue)
      );
    } else if (typeof value == "function") {
      throw new Error(`Can't flatten object with function as a value of ${key}. Path to node: ${path.join(".")}`);
    } else {
      res[key] = value;
    }
  }
  return res;
}

type Maybe<T> = T | undefined | null;

function jsonOrString(value: Maybe<string>, ifString: (s: Maybe<string>) => any = s => s) {
  if (!value) {
    return ifString(value);
  }
  try {
    return flatten(JSON5.parse(value));
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
      addRecord(streamSink, key, null, {
        values: (await redis.lRange(key, 0, -1)).map(el => jsonOrString(el)),
      });
      break;
    case "set":
      addRecord(streamSink, key, null, {
        values: (await redis.sMembers(key)).map(el => jsonOrString(el)),
      });
      break;
    case "zset":
      addRecord(streamSink, key, null, {
        values: (await redis.sMembers(key)).map(el => jsonOrString(el)),
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
const streamer: Streamer<RedisConfig, HashStreamConfig> = async (
  sourceConfig: RedisConfig,
  streamName: string,
  streamConfiguration: StreamConfiguration<HashStreamConfig>,
  streamSink: StreamSink,
  services: { state: StateService }
) => {
  const redis = await connect(sourceConfig);
  try {
    let redisKeyPattern = streamConfiguration.params.redis_key || "*";
    if (redisKeyPattern.indexOf("*") >= 0) {
      let keys = await redis.dbSize();
      console.log(`Going to scan through ${formatNum(keys)}, matching pattern '${redisKeyPattern}'`);
      let cursor = 0;
      let scanIterations = 0;
      while (true) {
        let scanRes = await redis.scan(cursor, { MATCH: redisKeyPattern, COUNT: redisScanCount });
        scanIterations++;
        console.log(
          `Scanned ${formatNum(scanIterations * redisScanCount)} / ${formatNum(keys)} keys (${formatNum(
            ((scanIterations * redisScanCount) / keys) * 100
          )}%). Got ${scanRes.keys.length} keys`
        );
        for (const key of scanRes.keys) {
          await processRedisKey(key, redis, streamSink);
        }
        cursor = scanRes.cursor;
        if (cursor === 0) {
          break;
        }
      }
    } else {
      console.log(`Running GET ${redisKeyPattern}`);
      await processRedisKey(redisKeyPattern, redis, streamSink);
    }
  } finally {
    await redis.disconnect();
  }
};

function addRecord(sink: StreamSink, redisKey: string, redisHash: string | null, object: any) {
  sink.addRecord({
    ...object,
    __id: redisHash ? redisKey + "/" + redisHash : redisKey,
    redis_key: redisKey,
    redis_hash: redisHash,
  });
}

const sourceConnector = { getAllStreams, streamer };

export { sourceConnector, descriptor, validator };
