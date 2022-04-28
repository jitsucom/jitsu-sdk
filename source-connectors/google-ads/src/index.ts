import { SourceCatalog, StateService, StreamReader, StreamSink, StreamConfiguration } from "@jitsu/types/sources";
import { ConfigValidationResult, ExtensionDescriptor } from "@jitsu/types/extension";
import { googleAdsStreamsTypes } from "./streamsTypes";

export interface GoogleAdsConfig {
  developer_token: string;
  customer_id: string;
  manager_customer_id?: string;
  "auth.type": string;
  "auth.client_secret"?: string;
  "auth.refresh_token"?: string;
  "auth.client_id"?: string;
  "auth.service_account_key"?: string;
  "auth.subject"?: string;
}

export interface GoogleAdsStreamConfig {
  fields: string;
  start_date: string;
}

const descriptor: ExtensionDescriptor<GoogleAdsConfig> = {
  id: "google-analytics",
  displayName: "Google Ads Source",
  description: "This source pulls data from Google Ads API",
  configurationParameters: [
    {
      displayName: "Developer Token",
      id: "developer_token",
      type: "password",
      required: true,
      documentation: `
        <div>
          Standalone Open-Source instances of Jitsu require a special Developer Token to work with Google Ads API.
          <br />
          Please read the official documentation from Google:{" "}
          <a href="https://developers.google.com/google-ads/api/docs/first-call/dev-token" target={"_blank"}>
            Obtain Your Developer Token
          </a>
          <br />
          <br />
          <b>Attention:</b>
          <br />
          Developer Token is an application secret. It must not be exposed to anyone outside of your company.
          <br />
          It is highly recommended to set Developer Token in Jitsu Server config instead of UI form.
          <br />
          <b>as yaml config variable:</b>
          <br />
          <code>google_ads.developer_token: abc123</code>
          <br />
          <b>or as environment variable:</b>
          <br />
          <code>GOOGLE_ADS_DEVELOPER_TOKEN=abc123</code>
          <br />
          <br />
          Cloud Jitsu version has its own embed Developer Token – no extra actions is required.
        </>
      `,
    },
    {
      displayName: "Customer ID",
      id: "customer_id",
      type: "string",
      required: true,
      documentation: `The client customer ID is the account number of the Google Ads client account you want to pull data from. Pass it without '-' symbols.`,
    },
    {
      displayName: "Manager Customer ID",
      id: "manager_customer_id",
      type: "string",
      required: false,
      documentation: `For Google Ads API calls made by a manager to a client account (that is, when logging in as a manager to make API calls to one of its client accounts), you also need to supply the Manager Customer Id. This value represents the Google Ads customer ID of the manager making the API call. Pass it without '-' symbols.`,
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
    {
      displayName: "Subject",
      id: "auth.subject",
      type: "string",
      relevantIf: {
        field: "auth.type",
        value: "Service Account",
      },
      required: true,
      documentation: `A Google Ads user with permissions on the Google Ads account you want to access. Google Ads does not support using service accounts without impersonation.`,
    },
  ],
};

async function validator(config: GoogleAdsConfig): Promise<ConfigValidationResult> {
  return true;
}

const sourceCatalog: SourceCatalog<GoogleAdsConfig, GoogleAdsStreamConfig> = async config => {
  return googleAdsStreamsTypes.map(type => ({
    type,
    supportedModes: ["full_sync"],
    params: [
      {
        id: "fields",
        displayName: "Fields",
        documentation: `
          <div>
            {" "}
            Use{" "}
            <a href="https://developers.google.com/google-ads/api/fields/v8/overview_query_builder">
              Google Ads Query Builder
            </a>{" "}
            tool to build required query. Copy comma-separated field list from resulting GAQL query (part between SELECT
            and FROM keywords). Don't forget to add date segments (e.g. segments.date) where it is necessary.
          </div>
        `,
        // prettier-ignore
        type: "string",
        required: true,
      },
      {
        id: "start_date",
        displayName: "Start Date",
        type: "isoUtcDate",
        defaultValue: "2020-01-01",
        required: true,
      },
    ],
  }));
};

const streamReader: StreamReader<GoogleAdsConfig, GoogleAdsStreamConfig> = async (
  sourceConfig: GoogleAdsConfig,
  streamType: string,
  streamConfiguration: StreamConfiguration<GoogleAdsStreamConfig>,
  streamSink: StreamSink,
  services: { state: StateService }
) => {};

export { streamReader, sourceCatalog, descriptor, validator };
