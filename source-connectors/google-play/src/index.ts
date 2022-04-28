import { SourceCatalog, StateService, StreamReader, StreamSink, StreamConfiguration } from "@jitsu/types/sources";
import { ConfigValidationResult, ExtensionDescriptor } from "@jitsu/types/extension";

export interface GooglePlayConfig {
  account_id: string;
  "auth.type": string;
  "auth.client_secret"?: string;
  "auth.refresh_token"?: string;
  "auth.client_id"?: string;
  "auth.service_account_key"?: string;
  "auth.subject"?: string;
}

export interface GooglePlayStreamConfig {}

const descriptor: ExtensionDescriptor<GooglePlayConfig> = {
  id: "google-analytics",
  displayName: "Google Play Source",
  description:
    "The Google Play connector can sync <b>earnings</b> (financial report) and <b>sales</b> (statistics about sales).",
  configurationParameters: [
    {
      displayName: "Bucket ID",
      id: "account_id",
      type: "string",
      required: true,
      documentation: `
        <div>
          <b>Google Cloud Storage Bucket ID:</b>
          <br />
          Sign in to your Google Play account.
          <br />
          In the right pane, select the app in the <b>Select an app</b> field.
          <br />
          Scroll to the end of the page to the Direct Report URIs section and copy the Bucket ID.
          <br />
          Your bucket ID begins with <b>pubsite_prod_</b>
          <br />
          For example: pubsite_prod_123456789876543
        </div>
      `,
    },
    {
      displayName: "Authorization Type",
      id: "auth.type",
      required: true,
      type: { oneOf: ["OAuth", "Service Account"] },
      defaultValue: "OAuth",
      documentation: `
        <p>
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
        </p>
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
      documentation: `A Google Play user with permissions on the Google Play account you want to access. Google Play does not support using service accounts without impersonation.`,
    },
  ],
};

async function validator(config: GooglePlayConfig): Promise<ConfigValidationResult> {
  return true;
}

const sourceCatalog: SourceCatalog<GooglePlayConfig, GooglePlayStreamConfig> = async config => {
  return [
    {
      type: "earnings",
      supportedModes: ["full_sync"],
    },
    {
      type: "sales",
      supportedModes: ["full_sync"],
    },
  ];
};

const streamReader: StreamReader<GooglePlayConfig, GooglePlayStreamConfig> = async (
  sourceConfig: GooglePlayConfig,
  streamType: string,
  streamConfiguration: StreamConfiguration<GooglePlayStreamConfig>,
  streamSink: StreamSink,
  services: { state: StateService }
) => {};

export { streamReader, sourceCatalog, descriptor, validator };
