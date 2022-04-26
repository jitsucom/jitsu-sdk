import { SourceCatalog, StateService, StreamReader, StreamSink, StreamConfiguration } from "@jitsu/types/sources";
import { ConfigValidationResult, ExtensionDescriptor } from "@jitsu/types/extension";

export interface GoogleAnalyticsConfig {
  view_id: string;
  "auth.type": string;
  "auth.client_secret"?: string;
  "auth.refresh_token"?: string;
  "auth.client_id"?: string;
  "auth.service_account_key"?: string;
}

export interface GoogleAnalyticsStreamConfig {
  tableId: string;
  fields?: string;
}

const descriptor: ExtensionDescriptor<GoogleAnalyticsConfig> = {
  id: "google-analytics",
  displayName: "Google Analytics Source",
  description: "This source pulls data from Google Analytics API",
  configurationParameters: [
    {
      displayName: "View ID",
      id: "view_id",
      required: true,
      documentation:
        "Read on how to find Google Analytics View ID here: https://jitsu.com/docs/sources-configuration/google-analytics#how-to-find-google-analytics-view-id",
    },
    {
      displayName: "Authorization Type",
      id: "auth.type",
      required: true,
      type: {
        options: [
          {
            id: "OAuth",
            displayName: "OAuth",
          },
          {
            id: "Service Account",
            displayName: "Service Account",
          },
        ],
        maxOptions: 1,
      },
      defaultValue: "OAuth",
      documentation: `
        <div>
          Jitsu provides two types for authorizing access to Google Services:
          <ul>
            <li>
              <b>OAuth</b> — you'll need to provide Client Secret / Client Id (you can obtain in in Google Cloud
              Console) and get a refresh token. Jitsu developed a small{" "}
              <a href="https://github.com/jitsucom/oauthcli">CLI utility to obtain those tokens</a>
            </li>
            <li>
              <b>Service Account</b> — you'll a){" "}
              <a href="https://cloud.google.com/iam/docs/creating-managing-service-account-keys">
                create a service account in Google Cloud Console
              </a>{" "}
              b) share google resource (such as ocument or analytics property) with this account (account email look
              like <code>[username]@jitsu-customers.iam.gserviceaccount.com</code>) c) put Service Account Key JSON
              (available in Google Cloud Console) in the field below
            </li>
          </ul>
        </div>
        `,
    },
    {
      displayName: "OAuth Client ID",
      id: "auth.client_id",
      type: "password",
      relevantIf: {
        field: "auth.type",
        value: "OAuth",
      },
      required: true,
      documentation: "Use Jitsu OAuth CLI Util to obtain oauth credentials (https://github.com/jitsucom/oauthcli)",
    },
    {
      displayName: "Refresh Token",
      id: "auth.refresh_token",
      type: "string",
      relevantIf: {
        field: "auth.type",
        value: "OAuth",
      },
      required: true,
      documentation: "Use Jitsu OAuth CLI Util to obtain oauth credentials (https://github.com/jitsucom/oauthcli)",
    },
    {
      displayName: "Auth (Service account key JSON)",
      id: "auth.service_account_key",
      type: "json",
      relevantIf: {
        field: "auth.type",
        value: "Service Account",
      },
      required: true,
      documentation:
        "Use Google Cloud Console to create Service Account get Service Key JSON (https://cloud.google.com/iam/docs/creating-managing-service-account-keys)",
    },
  ],
};

async function validator(config: GoogleAnalyticsConfig): Promise<ConfigValidationResult> {
  return true;
}

const sourceCatalog: SourceCatalog<GoogleAnalyticsConfig, GoogleAnalyticsStreamConfig> = async config => {
  return [
    {
      type: "table",
      streamName: "table",
      mode: "full_sync",
      params: [
        // {
        //   id: "tableId",
        //   displayName: "GoogleAnalytics Id",
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

const streamReader: StreamReader<GoogleAnalyticsConfig, GoogleAnalyticsStreamConfig> = async (
  sourceConfig: GoogleAnalyticsConfig,
  streamName: string,
  streamConfiguration: StreamConfiguration<GoogleAnalyticsStreamConfig>,
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
