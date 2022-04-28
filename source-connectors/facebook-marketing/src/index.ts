import { SourceCatalog, StateService, StreamReader, StreamSink, StreamConfiguration } from "@jitsu/types/sources";
import { ConfigValidationResult, ExtensionDescriptor } from "@jitsu/types/extension";

export interface FacebookMarketingConfig {
  account_id: string;
  access_token: string;
}

export interface FacebookMarketingStreamConfig {
  fields: string;
  level: string;
}

const descriptor: ExtensionDescriptor<FacebookMarketingConfig> = {
  id: "facebook",
  displayName: "Facebook Marketing Source",
  description: `
    <div>
      The Facebook connector pulls data from{" "}
      <a href="https://developers.facebook.com/docs/marketing-api/insights/">Facebook Insights API</a>. The connector
      is highly configurable and can pull data broken down by any dimensions from ads-, adset-, campaign- or
      account-level data
    </div>
  `,
  configurationParameters: [
    {
      displayName: "Account ID",
      id: "account_id",
      type: "string",
      required: true,
      documentation: `
        <a target="_blank" href="https://www.facebook.com/business/help/1492627900875762" rel="noreferrer">
          How to get Facebook Account ID
        </a>
      `,
    },
    {
      displayName: "Access Token",
      id: "access_token",
      type: "password",
      required: true,
      documentation: `
        <a
          target="_blank"
          href="https://developers.facebook.com/docs/pages/access-tokens/#get-a-long-lived-user-access-token"
          rel="noreferrer"
        >
          How to get Facebook Access Token
        </a>
      `,
    },
  ],
};

async function validator(config: FacebookMarketingConfig): Promise<ConfigValidationResult> {
  return true;
}

const sourceCatalog: SourceCatalog<FacebookMarketingConfig, FacebookMarketingStreamConfig> = async config => {
  return [
    {
      type: "ads",
      supportedModes: ["full_sync"],
      params: [
        {
          // applyOnlyTo: "ads",
          displayName: "Report Fields",
          id: "fields",
          // prettier-ignore
          type: { severalOf: ['bid_amount', 'adlabels', 'creative', 'status', 'created_time', 'updated_time', 'targeting', 'effective_status', 'campaign_id', 'adset_id', 'conversion_specs', 'recommendations', 'id', 'bid_info', 'last_updated_by_app_id', 'tracking_specs', 'bid_type', 'name', 'account_id', 'source_ad_id']},
          required: true,
          documentation: `Ads fields to download`,
        },
        {
          displayName: "Level of data",
          id: "level",
          defaultValue: "ad",
          type: { oneOf: ["ad", "adset", "campaign", "account"] },
          documentation: `One of [ad, adset, campaign, account]. Read more: https://developers.facebook.com/docs/marketing-api/reference/adgroup/insights/`,
        },
      ],
    },
    {
      type: "insights",
      supportedModes: ["full_sync"],
      params: [
        {
          displayName: "Report Fields",
          id: "fields",
          // prettier-ignore
          type: { severalOf: ['account_currency', 'account_id', 'account_name', 'ad_id', 'ad_name', 'adset_id', 'adset_name', 'campaign_id', 'campaign_name', 'objective', 'buying_type', 'cpc', 'cpm', 'cpp', 'ctr', 'estimated_ad_recall_rate', 'estimated_ad_recallers', 'reach', 'unique_clicks', 'unique_ctr', 'frequency', 'actions', 'conversions', 'spend', 'impressions']},
          required: true,
          documentation: `Insights fields to download`,
        },
        {
          displayName: "Level of data",
          id: "level",
          defaultValue: "ad",
          type: { oneOf: ["ad", "adset", "campaign", "account"] },
          documentation: `One of [ad, adset, campaign, account]. Read more: https://developers.facebook.com/docs/marketing-api/reference/adgroup/insights/`,
        },
      ],
    },
  ];
};

const streamReader: StreamReader<FacebookMarketingConfig, FacebookMarketingStreamConfig> = async (
  sourceConfig: FacebookMarketingConfig,
  streamType: string,
  streamConfiguration: StreamConfiguration<FacebookMarketingStreamConfig>,
  streamSink: StreamSink,
  services: { state: StateService }
) => {};

export { streamReader, sourceCatalog, descriptor, validator };
