import { SourceCatalog, StateService, StreamReader, StreamSink, StreamConfiguration } from "@jitsu/types/sources";
import { ConfigValidationResult, ExtensionDescriptor } from "@jitsu/types/extension";

export interface AmplitudeConfig {
  api_key: string;
  secret_key: string;
}

export interface AmplitudeStreamConfig {}

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
      documentation: `Amplitude API Key from project settings page. Only Amplitude Admins and Managers can view the API Key.`,
    },
    {
      displayName: "Secret Key",
      id: "secret_key",
      type: "string",
      required: true,
      documentation: `Amplitude Secret Key from project settings page. Only Amplitude Admins and Managers can view the Secret Key.`,
    },
  ],
};

async function validator(config: AmplitudeConfig): Promise<ConfigValidationResult> {
  return true;
}

const sourceCatalog: SourceCatalog<AmplitudeConfig, AmplitudeStreamConfig> = async config => {
  return [
    {
      type: "active_users",
      supportedModes: ["full_sync"],
    },
    {
      type: "annotations",
      supportedModes: ["full_sync"],
    },
    {
      type: "average_sessions",
      supportedModes: ["full_sync"],
    },
    {
      type: "cohorts",
      supportedModes: ["full_sync"],
    },
    {
      type: "events",
      supportedModes: ["full_sync"],
    },
    {
      type: "new_users",
      supportedModes: ["full_sync"],
    },
    {
      type: "table",
      supportedModes: ["full_sync"],
    },
  ];
};

const streamReader: StreamReader<AmplitudeConfig, AmplitudeStreamConfig> = async (
  sourceConfig: AmplitudeConfig,
  streamType: string,
  streamConfiguration: StreamConfiguration<AmplitudeStreamConfig>,
  streamSink: StreamSink,
  services: { state: StateService }
) => {};

export { streamReader, sourceCatalog, descriptor, validator };
