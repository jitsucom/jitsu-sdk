import { ConfigValidationResult, ExtensionDescriptor } from "@jitsu/types/extension";
import Airtable from "airtable";
import { PermanentStorage, SourceFunctions, StreamConfigurationParameters, StreamSink } from "@jitsu/types/source";
import { flatten } from "@jitsu/pipeline-helpers";

export interface AirtableConfig extends Record<string, string> {
  apiKey: string;
  baseId: string;
}

export const descriptor: ExtensionDescriptor = {
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
async function validator(config: Record<string, string>): Promise<ConfigValidationResult> {
  const airtable = new Airtable({ apiKey: config.apiKey });

  const response = await airtable.base(config.baseId).makeRequest();
  console.log(response);

  return true;
}

export const source: SourceFunctions<AirtableConfig> = {
  async getAllStreams(config: AirtableConfig): Promise<StreamConfigurationParameters[]> {
    return [
      {
        streamName: "table",
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
  },
  async streamData(
    sourceConfig: AirtableConfig,
    streamConfig: Record<string, any>,
    sink: StreamSink,
    services: { storage: PermanentStorage }
  ) {
    const airtable = new Airtable({ apiKey: sourceConfig.apiKey });

    let table = airtable.base(sourceConfig.baseId).table(streamConfig.tableId);
    console.log(`Connected to ${sourceConfig.baseId} / ${streamConfig.tableId}`);

    let allRecords = await table.select().all();
    allRecords.forEach(r => {
      const { id, createdTime, fields } = r._rawJson;
      sink.emmit({ uniqueId: id, created: new Date(createdTime), ...flatten(fields, { skipArrays: true }) });
    });
  },
};