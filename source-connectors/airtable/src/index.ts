import { SourceCatalog, StateService, StreamReader, StreamSink, StreamConfiguration } from "@jitsu/types/sources";
import Airtable, { Record } from "airtable";
import { ConfigValidationResult, ExtensionDescriptor } from "@jitsu/types/extension";
import { QueryParams } from "airtable/lib/query_params";

export interface AirtableConfig {
  apiKey: string;
  baseId: string;
}

export interface TableStreamConfig {
  tableId: string;
  viewId?: string;
  fields?: string;
}

const descriptor: ExtensionDescriptor = {
  id: "airtable",
  displayName: "Airtable Source",
  icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%"><path d="M28.578 5.906L4.717 15.78c-1.327.55-1.313 2.434.022 2.963l23.96 9.502a8.89 8.89 0 0 0 6.555 0l23.96-9.502c1.335-.53 1.35-2.414.022-2.963l-23.86-9.873a8.89 8.89 0 0 0-6.799 0" fill="#fc0"/><path d="M34.103 33.433V57.17a1.6 1.6 0 0 0 2.188 1.486l26.7-10.364A1.6 1.6 0 0 0 64 46.806V23.07a1.6 1.6 0 0 0-2.188-1.486l-26.7 10.364a1.6 1.6 0 0 0-1.009 1.486" fill="#31c2f2" /> <path d="M27.87 34.658l-8.728 4.215-16.727 8.015c-1.06.512-2.414-.26-2.414-1.44V23.17c0-.426.218-.794.512-1.07a1.82 1.82 0 0 1 .405-.304c.4-.24.97-.304 1.455-.112l25.365 10.05c1.3.512 1.4 2.318.133 2.925" fill="#ed3049" /><path d="M27.87 34.658l-7.924 3.826L.512 22.098a1.82 1.82 0 0 1 .405-.304c.4-.24.97-.304 1.455-.112l25.365 10.05c1.3.512 1.4 2.318.133 2.925" fill="#c62842" /></svg>',
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
          id: "viewId",
          displayName: "View Id",
          documentation:
            "Read how to get view id: https://support.airtable.com/hc/en-us/articles/4405741487383-Understanding-Airtable-IDs",
          required: false,
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
  let selectParams: QueryParams<any> = {};
  if (selectedFields.length > 0) {
    streamSink.log("INFO", "Fields filter: " + JSON.stringify(selectedFields));
    selectParams.fields = selectedFields;
  }
  if (streamConfiguration.parameters.viewId) {
    selectParams.view = streamConfiguration.parameters.viewId;
  }
  let allRecords = await table.select(selectParams).all();
  allRecords.forEach(r => {
    const { id, createdTime, fields } = r._rawJson;
    streamSink.addRecord({
      $id: id,
      $recordTimestamp: new Date(createdTime),
      ...fields,
    });
  });
};

export { streamReader, sourceCatalog, descriptor, validator };
