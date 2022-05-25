import ga from "@googleapis/analyticsreporting";

export type GAnalyticsReport = ga.analyticsreporting_v4.Schema$Report;
export type GAnalyticsReportRow = ga.analyticsreporting_v4.Schema$ReportRow;

/**
 * Creates authorized instance of Goole Analytics API Client
 *
 * @todo implement authorization via Service Account
 *
 * @param config Google Analytics Source config
 * @returns Google Analytics reporting client
 */
export const getGoogleAnalyticsReportingClient = async (
  config: GoogleAnalyticsConfig
): Promise<ga.analyticsreporting_v4.Analyticsreporting> => {
  return new ga.analyticsreporting_v4.Analyticsreporting({ auth: await getAuth(config) });
};

const getAuth = async (config: GoogleAnalyticsConfig) => {
  const errorPrefix = `Failed to initialize Google Analytics Reporting API client auth.`;
  const authType = config.auth_type;
  switch (authType) {
    case "OAuth":
      const oauth = new ga.auth.OAuth2({
        clientId: config.client_id,
        clientSecret: config.client_secret,
      });
      await oauth.setCredentials({
        refresh_token: config.refresh_token,
      });
      return oauth;

    case "Service Account":
      throw new Error(`Service Account auth not implemented`);
    // if (!config["auth.service_account_key"]) {
    //   throw new Error(`'auth.service_account_key' parameter is required for auth.type:="${config["auth.type"]}"`);
    // }
    // let serviceAccountKeyJson: any;
    // try {
    //   serviceAccountKeyJson = JSON.parse(config["auth.service_account_key"].replace(/(\n)/gm, "\\n"));
    // } catch (error) {
    //   throw new Error(`Failed to parse 'auth.service_account_key' field; ${error}`);
    // }
    // return ga.auth.fromJSON(serviceAccountKeyJson);

    default:
      throw new Error(
        `${errorPrefix} Authorization type ${authType} is not supported. Supported values: ["OAuth", "Service Account"]`
      );
  }
};
