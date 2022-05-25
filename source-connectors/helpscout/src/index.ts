import {
  SourceCatalog,
  StateService,
  StreamReader,
  StreamSink,
  StreamConfiguration,
  StreamInstance,
} from "@jitsu/types/sources";
import { ConfigValidationResult, ExtensionDescriptor } from "@jitsu/types/extension";

export interface HelpscoutConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  lookbackDays?: number;
}

const descriptor: ExtensionDescriptor<HelpscoutConfig> = {
  id: "helpscout",
  displayName: "Helpscout Source",
  icon: "https://style.helpscout.com/images/logo/help-scout-logo-circle.svg",
  description: "This source pulls data from Helpscout base",
  configurationParameters: [
    {
      id: "clientId",
      displayName: "OAuth Client ID",
      required: true,
    },
    {
      id: "clientSecret",
      displayName: "OAuth Client Secret",
      required: true,
    },
    {
      id: "refreshToken",
      displayName: "Refresh Token",
      required: true,
    },
    {
      id: "lookbackDays",
      displayName: "How many days from the past to fetch (180 by default)",
      type: "int",
      required: false,
    },
  ],
};

async function validator(config: HelpscoutConfig): Promise<ConfigValidationResult> {
  return true;
}

export type HelpscoutEntity = {
  urlSuffix?: string;
  getObjectArray?: (obj: any) => any[];
  getId?: (obj: any) => string;
};

export type HelpscoutReport = {
  urlSuffix?: string;
  getLines?(data: any): any[];
  getLineId?(line: any): string;
};

const entities: Record<string, HelpscoutEntity> = {
  customers: {},
  conversations: {},
  users: {},
};

const reports: Record<string, HelpscoutReport> = {
  happiness: {},
  happiness_ratings: { urlSuffix: "happiness/ratings", getLines: data => data.results },
  chat: {},
  docs: {},
  productivity: {},
  email: {},
  company: {},
  conversations: {},
};

const sourceCatalog: SourceCatalog<HelpscoutConfig> = async () => {
  const entitiesIds: StreamInstance[] = Object.keys(entities).map(entity => ({
    type: entity,
    supportedModes: ["full_sync"],
  }));
  const reportsIds: StreamInstance[] = Object.keys(reports).map(report => ({
    type: `report_${report}`,
    supportedModes: ["full_sync"],
  }));
  return [...entitiesIds, ...reportsIds];
};

const fetchOrThrow = async (url: string, init?: RequestInit): Promise<any> => {
  const result = await fetch(url, init);
  if (!result.ok) {
    throw new Error(`Error calling ${init?.method || "GET"} ${url} - ${result.status}: ${await result.text()}`);
  }
  return await result.json();
};

async function connect(config: HelpscoutConfig, state: StateService): Promise<string> {
  const savedRefreshToken = await state.get("refreshToken");
  const refreshToken = config.refreshToken || savedRefreshToken;
  if (!refreshToken) {
    throw new Error("Refresh token is not provided");
  }
  console.info(
    `Connecting to HelpScout using ${savedRefreshToken ? "saved" : "configured"} refresh token: ${refreshToken}`
  );
  const req = {
    method: "POST",
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
  };
  const response = await fetchOrThrow("https://api.helpscout.net/v2/oauth2/token", req);
  if (response.refresh_token) {
    console.info("Saving new refresh token " + response.refresh_token);
  } else {
    console.warn(`No refresh token in response: ${JSON.stringify(response)}`);
  }
  if (!response.access_token) {
    throw new Error(`No access token in response: ${JSON.stringify(response)}`);
  }
  return response.access_token as string;
}

async function paginatedFetch(_url: string, req: RequestInit, handler: (data: any) => any) {
  let url = _url;
  while (url) {
    const data = await fetchOrThrow(url, req);
    await handler(data);
    url = data._links.next;
  }
}

type Day = {
  startUTC: Date;
  endUTC: Date;
};

function asDay(date: Date): Day {
  const startUTC = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  startUTC.setUTCHours(0);
  const endUTC = new Date(startUTC);
  endUTC.setUTCDate(endUTC.getUTCDate() + 1);
  endUTC.setUTCMilliseconds(-1);
  return { startUTC, endUTC };
}

function getDaysBack(date: Date, days: number): Day[] {
  const result: Day[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(date.getTime());
    day.setDate(day.getDate() - i);
    result.push(asDay(day));
  }
  return result;
}

const streamReader: StreamReader<HelpscoutConfig> = async (
  sourceConfig: HelpscoutConfig,
  streamType: string,
  streamConfiguration: StreamConfiguration,
  streamSink: StreamSink,
  services: { state: StateService }
) => {
  if (streamType.indexOf("report_") !== 0) {
    const {
      getObjectArray = obj => obj._embedded[streamType],
      getId = obj => obj.id,
      urlSuffix = streamType,
    } = entities[streamType];
    const accessToken = await connect(sourceConfig, services.state);
    await paginatedFetch(
      `https://api.helpscout.net/v2/${urlSuffix}`,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      },
      (data: any) => {
        for (const obj of getObjectArray(data)) {
          streamSink.addRecord({ $id: getId(obj), ...obj });
        }
      }
    );
  } else {
    const accessToken = await connect(sourceConfig, services.state);
    const report = streamType.substring("report_".length);
    const {
      urlSuffix = report,
      getLines = data => [data.current],
      getLineId = data => data.id || "",
    } = reports[report];
    const lookbackPeriod = sourceConfig.lookbackDays || 180;
    const days = getDaysBack(new Date(), lookbackPeriod);
    for (const day of days) {
      const url = `https://api.helpscout.net/v2/reports/${urlSuffix}?start=${day.startUTC.toISOString()}&end=${day.endUTC.toISOString()}`;
      const data = await fetchOrThrow(url, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });
      for (const line of getLines(data)) {
        streamSink.addRecord({
          $id: `${day.startUTC.toISOString()}/${getLineId(line)}`,
          dayStart: day.startUTC.toISOString(),
          dayEnd: day.endUTC.toISOString(),
          ...line,
        });
      }
    }
  }
};

export { streamReader, sourceCatalog, descriptor, validator };
