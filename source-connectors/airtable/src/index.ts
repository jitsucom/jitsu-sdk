import { SourceCatalog, StateService, StreamReader, StreamSink, StreamConfiguration } from "@jitsu/types/sources";
import Airtable, { Record } from "airtable";
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
  // console.log(`Will connect to airtable with apiKey=${config.apiKey} and baseId=${config.baseId}`);
  // const airtable = new Airtable({ apiKey: config.apiKey });
  // const response = await airtable.base(config.baseId).makeRequest();
  // console.log("Airtable response:" + response);
  return true;
}

const sourceCatalog: SourceCatalog<AirtableConfig, TableStreamConfig> = async (config: AirtableConfig) => {
  return [
    {
      type: "table",
      supportedModes: ["full_sync"],
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
          documentation: "Comma separated list of field names. If empty or undefined - all fields will be downloaded",
          required: false,
        },
      ],
    },
  ];
};

const streamReader: StreamReader<AirtableConfig, TableStreamConfig> = async (
  sourceConfig: AirtableConfig,
  streamType: string,
  streamConfiguration: StreamConfiguration<TableStreamConfig>,
  streamSink: StreamSink,
  services: { state: StateService }
) => {
  if (streamType !== "table") {
    throw new Error(`${streamType} streams is not supported`);
  }
  const airtable = new Airtable({ apiKey: sourceConfig.apiKey });

  let table = airtable.base(sourceConfig.baseId).table(streamConfiguration.parameters.tableId);
  const selectedFields = streamConfiguration.parameters.fields
    ? streamConfiguration.parameters.fields.split(",").map(f => f.trim())
    : [];
  if (selectedFields.length > 0) {
    streamSink.log("INFO", "Fields filter: " + JSON.stringify(selectedFields));
  }
  let allRecords = await table.select({ fields: selectedFields }).all();
  allRecords.forEach(r => {
    const { id, createdTime, fields } = r._rawJson;
    streamSink.addRecord({
      __id: id,
      created: new Date(createdTime),
      __sql_type_created: "timestamp with time zone",
      ...fields,
    });
  });
};

export { streamReader, sourceCatalog, descriptor, validator };
