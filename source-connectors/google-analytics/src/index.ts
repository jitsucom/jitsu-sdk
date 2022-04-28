import { googleAnalyticsDimensions } from "./dimensions";
import { googleAnalyticsMetrics } from "./metrics";
import type { SourceCatalog, StateService, StreamReader, StreamSink, StreamConfiguration } from "@jitsu/types/sources";
import type { ConfigValidationResult, ExtensionDescriptor } from "@jitsu/types/extension";
import { getGoogleAnalyticsReportingClient } from "./reporting";

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
      type: { oneOf: ["OAuth", "Service Account"] },
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
      id: "auth.client_secret",
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
      type: "password",
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
      type: "report",
      supportedModes: ["full_sync"],
      params: [
        {
          id: "dimensions",
          displayName: "Dimensions",
          type: {
            severalOf: googleAnalyticsDimensions,
            max: 7,
          },
          documentation:
            "Use this tool to check dimensions compatibility: https://ga-dev-tools.appspot.com/dimensions-metrics-explorer/",
          required: false,
        },
        {
          id: "metrics",
          displayName: "Metrics",
          type: {
            severalOf: googleAnalyticsMetrics,
            max: 20,
          },
          documentation:
            "Use this tool to check metrics compatibility: https://ga-dev-tools.appspot.com/dimensions-metrics-explorer/",
          required: false,
        },
      ],
    },
  ];
};

const streamReader: StreamReader<GoogleAnalyticsConfig, GoogleAnalyticsStreamConfig> = async (
  sourceConfig: GoogleAnalyticsConfig,
  streamType: string,
  streamConfiguration: StreamConfiguration<GoogleAnalyticsStreamConfig>,
  streamSink: StreamSink,
  services: { state: StateService }
) => {
  // if (streamType !== "report") {
  //   throw new Error(`${streamType} streams is not supported`);
  // }

  const ga = await getGoogleAnalyticsReportingClient(sourceConfig);
  console.log("GA authorisation successful");
  const reports = ga.reports.batchGet({
    requestBody: {
      reportRequests: [
        {
          dimensions: streamConfiguration.parameters.dimensions.map(dimension => ({ name: dimension })),
          metrics: streamConfiguration.parameters.metrics.map(metric => ({ expression: metric })),
        },
      ],
    },
  });
  console.log("Fetched reports successfully");

  streamSink.addRecord({
    __id: "testId",
    srcConfig: sourceConfig,
    type: streamType,
    config: streamConfiguration,
    streamMode: streamConfiguration.mode,
    "config.params.dimensions": streamConfiguration.parameters.dimensions,
    "config.params.metrics": streamConfiguration.parameters.metrics,
    reports,
  });
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

export { descriptor, validator, sourceCatalog, streamReader };
