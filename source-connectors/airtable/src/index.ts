import {
  GetAllStreams,
  StateService,
  SourceFunctions,
  Streamer,
  StreamSink,
  StreamConfiguration,
} from "@jitsu/types/sources";
import Airtable, { Record } from "airtable";
import { TableObject } from "@jitsu/types/sql-hints";
import { ConfigValidationResult, ExtensionDescriptor } from "@jitsu/types/extension";

export interface AirtableConfig {
  apiKey: string;
  baseId: string;
}

export interface TableStreamConfig {
  tableId: string;
  fields?: string;
}

const descriptor: ExtensionDescriptor = {
  id: "airtable",
  displayName: "Airtable Source",
  description: "This source pulls data from Airtable base",
  configurationParameters: [
    {
      id: "apiKey",
      displayName: "API Key",
      documentation:
        "Read on how to get API key here: https://support.airtable.com/hc/en-us/articles/219046777-How-do-I-get-my-API-key-",
      required: true,
    },
    {
      id: "baseId",
      displayName: "Base Id",
      documentation:
        "Read how to get Base ID: https://support.airtable.com/hc/en-us/articles/4405741487383-Understanding-Airtable-IDs",
      required: true,
    },
  ],
};

async function validator(config: AirtableConfig): Promise<ConfigValidationResult> {
  const airtable = new Airtable({ apiKey: config.apiKey });

  const response = await airtable.base(config.baseId).makeRequest();
  console.log(response);

  return true;
}

const getAllStreams: GetAllStreams<AirtableConfig, TableStreamConfig> = async (config: AirtableConfig) => {
  return [
    {
      streamName: "table",
      mode: "full_sync",
      params: [
        {
          id: "tableId",
          displayName: "Table Id",
          documentation:
            "Read how to get table id: https://support.airtable.com/hc/en-us/articles/4405741487383-Understanding-Airtable-IDs",
          required: true,
        },
        {
          id: "fields",
          displayName: "Fields",
          documentation: "Comma separated list of fields. If empty or undefined - all fields will be downloaded",
          required: false,
        },
      ],
    },
  ];
};

function sanitizeKey(key: any) {
  return key.replace(/[^a-z0-9]/gi, "_").toLowerCase();
}

function flatten(obj: any, path: string[] = []) {
  if (typeof obj !== "object") {
    throw new Error(`Can't flatten an object, expected object, but got" ${typeof obj}: ${obj}`);
  }
  if (Array.isArray(obj)) {
    return obj;
  }
  const res = {};

  for (let [key, value] of Object.entries(obj)) {
    key = sanitizeKey(key);
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

const streamer: Streamer<AirtableConfig, TableStreamConfig> = async (
  sourceConfig: AirtableConfig,
  streamName: string,
  streamConfiguration: StreamConfiguration<TableStreamConfig>,
  streamSink: StreamSink,
  services: { state: StateService }
) => {
  if (streamName !== "table") {
    throw new Error(`${streamName} streams is not supported`);
  }
  const airtable = new Airtable({ apiKey: sourceConfig.apiKey });

  let table = airtable.base(sourceConfig.baseId).table(streamConfiguration.params.tableId);

  let allRecords = await table.select().all();
  allRecords.forEach(r => {
    const { id, createdTime, fields } = r._rawJson;
    let flatRow = flatten(fields);
    streamSink.addRecord({
      __id: id,
      created: new Date(createdTime),
      __sql_type_created: "TIMESTAMPZ",
      ...flatRow,
    });
  });
};

const sourceConnector = { getAllStreams, streamer };

export { sourceConnector, descriptor, validator };