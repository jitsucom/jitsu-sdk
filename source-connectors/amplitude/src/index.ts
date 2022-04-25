import { SourceCatalog, StateService, StreamReader, StreamSink, StreamConfiguration } from "@jitsu/types/sources";
import { ConfigValidationResult, ExtensionDescriptor } from "@jitsu/types/extension";

export interface AmplitudeConfig {
  api_key: string;
  secret_key: string;
}

export interface AmplitudeStreamConfig {
  tableId: string;
  fields?: string;
}

const descriptor: ExtensionDescriptor<AmplitudeConfig> = {
  id: "amplitude",
  displayName: "Google Ads Source",
  description: "This source pulls data from Google Ads API",
  configurationParameters: [
    {
      displayName: "API Key",
      id: "api_key",
      type: "string",
      required: true,
      documentation: `
        <>Amplitude API Key from project settings page. Only Amplitude Admins and Managers can view the API Key.</>
      `,
    },
    {
      displayName: "Secret Key",
      id: "secret_key",
      type: "string",
      required: true,
      documentation: `
        <>
          Amplitude Secret Key from project settings page. Only Amplitude Admins and Managers can view the Secret Key.
        </>
      `,
    },
  ],
};

async function validator(config: AmplitudeConfig): Promise<ConfigValidationResult> {
  return true;
}

const sourceCatalog: SourceCatalog<AmplitudeConfig, AmplitudeStreamConfig> = async config => {
  return [
    {
      streamName: "table",
      mode: "full_sync",
      params: [
        // {
        //   id: "tableId",
        //   displayName: "Amplitude Id",
        //   documentation:
        //     "Read how to get table id: https://support.airtable.com/hc/en-us/articles/4405741487383-Understanding-Airtable-IDs",
        //   required: true,
        // },
        // {
        //   id: "fields",
        //   displayName: "Fields",
        //   documentation: "Comma separated list of fields. If empty or undefined - all fields will be downloaded",
        //   required: false,
        // },
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

const streamReader: StreamReader<AmplitudeConfig, AmplitudeStreamConfig> = async (
  sourceConfig: AmplitudeConfig,
  streamName: string,
  streamConfiguration: StreamConfiguration<AmplitudeStreamConfig>,
  streamSink: StreamSink,
  services: { state: StateService }
) => {
  if (streamName !== "table") {
    throw new Error(`${streamName} streams is not supported`);
  }
  // const airtable = new Airtable({ apiKey: sourceConfig.apiKey });

  // let table = airtable.base(sourceConfig.baseId).table(streamConfiguration.params.tableId);

  // let allRecords = await table.select().all();
  // allRecords.forEach(r => {
  //   const { id, createdTime, fields } = r._rawJson;
  //   let flatRow = flatten(fields);
  //   streamSink.addRecord({
  //     __id: id,
  //     created: new Date(createdTime),
  //     __sql_type_created: "TIMESTAMPZ",
  //     ...flatRow,
  //   });
  // });
};

export { streamReader, sourceCatalog, descriptor, validator };
