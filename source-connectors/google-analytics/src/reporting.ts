import ga from "@googleapis/analyticsreporting";

// /**
//  * Initializes google analytics reporting api client with provided credentials and returns it
//  */
// export class GoogleAnalyticsReporting {
//   constructor(config: GoogleAnalyticsConfig) {}
// }

export const getGoogleAnalyticsReportingClient = async (
  config: GoogleAnalyticsConfig
): Promise<ga.analyticsreporting_v4.Analyticsreporting> => {
  return new ga.analyticsreporting_v4.Analyticsreporting({ auth: await getAuth(config) });
};

const getAuth = async (config: GoogleAnalyticsConfig) => {
  const errorPrefix = `Failed to initialize Google Analytics Reporting API client auth.`;

  switch (config["auth.type"]) {
    case "OAuth":
      return await new ga.auth.GoogleAuth({
        clientOptions: {
          clientId: config["auth.client_id"],
          clientSecret: config["auth.client_secret"],
          refreshToken: config["auth.refresh_token"],
        },
      }).getClient();
    // const oauth = new ga.auth.OAuth2({
    //   clientId: config["auth.client_id"],
    //   clientSecret: config["auth.client_secret"],
    // });
    // oauth.setCredentials({ refresh_token: config["auth.refresh_token"] });
    // return oauth;
    case "Service Account":
      const saAuth = await new ga.auth.GoogleAuth({
        clientOptions: { key: config["auth.service_account_key"] },
      }).getClient();
      return saAuth;
    default:
      throw new Error(
        `${errorPrefix} Authorization type ${config["auth.type"]} is not supported. Supported values: ["OAuth", "Service Account"]`
      );
  }
};

// /**
//  * @todo
//  * Do not use this function in production.
//  * Use a more general implementation by `vklimontovich` instead once it is ready.
//  */
// const assertHasFields = <T, K extends keyof T>(obj: T, fieds: K[]): asserts obj is T & Required<Pick<T, K>> => {};
