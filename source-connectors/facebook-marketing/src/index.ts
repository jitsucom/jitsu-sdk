import { SourceCatalog, StateService, StreamReader, StreamSink, StreamConfiguration } from "@jitsu/types/sources";
import { ConfigValidationResult, ExtensionDescriptor } from "@jitsu/types/extension";

export interface FacebookMarketingConfig {
  account_id: string;
  access_token: string;
}

export interface FacebookMarketingStreamConfig {
  tableId: string;
  fields?: string;
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
    </>
  `,
  configurationParameters: [
    {
      displayName: "Account ID",
      id: "account_id",
      type: "string",
      required: true,
      documentation: `
        <div>
          <a target="_blank" href="https://www.facebook.com/business/help/1492627900875762" rel="noreferrer">
            How to get Facebook Account ID
          </a>
        </>
      `,
    },
    {
      displayName: "Access Token",
      id: "access_token",
      type: "password",
      required: true,
      documentation: `
        <div>
          <a
            target="_blank"
            href="https://developers.facebook.com/docs/pages/access-tokens/#get-a-long-lived-user-access-token"
            rel="noreferrer"
          >
            How to get Facebook Access Token
          </a>
        </>
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
      type: "table",
      streamName: "table",
      mode: "full_sync",
      params: [
        // {
        //   id: "tableId",
        //   displayName: "Facebook Id",
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

const streamReader: StreamReader<FacebookMarketingConfig, FacebookMarketingStreamConfig> = async (
  sourceConfig: FacebookMarketingConfig,
  streamName: string,
  streamConfiguration: StreamConfiguration<FacebookMarketingStreamConfig>,
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
