import { getGoogleAnalyticsReportingClient } from "./client";

import { googleAnalyticsDescriptor as descriptor } from "./descriptor";
import { googleAnalyticsValidator as validator } from "./validator";
import { googleAnalyticsSourceCatalog as sourceCatalog } from "./catalog";

import type { GAnalyticsReport, GAnalyticsReportRow } from "./client";
import type { StateService, StreamReader, StreamSink, StreamConfiguration } from "@jitsu/types/sources";
import { buildSignatureId } from "@jitsu/jlib/lib/sources-lib";
import { flatten } from "@jitsu/jlib";

const streamReader: StreamReader<GoogleAnalyticsConfig, GoogleAnalyticsStreamConfig> = async (
  sourceConfig: GoogleAnalyticsConfig,
  streamType: string,
  streamConfiguration: StreamConfiguration<GoogleAnalyticsStreamConfig>,
  streamSink: StreamSink,
  services: { state: StateService }
) => {
  if (streamType !== "report") {
    throw new Error(`${streamType} streams is not supported`);
  }
  streamSink.log("INFO", "Source config: " + JSON.stringify(sourceConfig));

  const gaClient = await getGoogleAnalyticsReportingClient(sourceConfig);

  let previousEndDate = new Date();
  const previousEndDateState = services.state.get("previous_end_date");
  let needCleanUp = false;
  if (previousEndDateState) {
    needCleanUp = true; //previous syncs detected
    previousEndDate = new Date(previousEndDateState);
    streamSink.log("INFO", "Previous end date from state: " + previousEndDate.toISOString());
  }
  const startDate = new Date(
    previousEndDate.getTime() - 1000 * 60 * 60 * 24 * (sourceConfig.refresh_window_days || 30)
  );
  const endDate = new Date();
  /**
   * Report in the format the same as in GO implementation
   */
  const report: GAnalyticsEvent[] = await loadReport(gaClient, sourceConfig, streamConfiguration, startDate, endDate);
  if (streamConfiguration.mode === "full_sync") {
    streamSink.clearStream();
    needCleanUp = false;
  }
  streamSink.newTransaction();
  if (needCleanUp) {
    streamSink.deleteRecords("_timestamp", ">=", previousEndDate.toISOString());
  }
  report.forEach(r => {
    streamSink.addRecord({
      __id: buildSignatureId(r),
      _timestamp: endDate.toISOString(),
      ...r,
    });
  });
  services.state.set("previous_end_date", endDate);
};

export { descriptor, validator, sourceCatalog, streamReader };

/**
 *
 * Utils
 *
 */

const loadReport = async (
  gaClient: Resolve<ReturnType<typeof getGoogleAnalyticsReportingClient>>,
  sourceConfig: GoogleAnalyticsConfig,
  streamConfiguration: StreamConfiguration<GoogleAnalyticsStreamConfig>,
  startDate: Date,
  endDate: Date
) => {
  const result: GAnalyticsEvent[] = [];

  let nextPageToken: string | null | undefined = null;
  do {
    const report = await fetchReport(gaClient, sourceConfig, streamConfiguration, startDate, endDate, nextPageToken);

    const header = report?.columnHeader;
    const dimHeaders = header?.dimensions ?? [];
    const metricHeaders = header?.metricHeader?.metricHeaderEntries ?? [];
    const rows = report?.data?.rows;

    rows?.forEach(row => {
      const gaEventWithDims = getGAEventWithDimensions(row, dimHeaders);
      const gaEventWithMetrics = getGAEventWithMetrics(row, metricHeaders);
      result.push({ ...gaEventWithDims, ...gaEventWithMetrics });
    });

    nextPageToken = report?.nextPageToken;
  } while (nextPageToken);

  return result;
};

const fetchReport = async (
  gaClient: Resolve<ReturnType<typeof getGoogleAnalyticsReportingClient>>,
  sourceConfig: GoogleAnalyticsConfig,
  streamConfiguration: StreamConfiguration<GoogleAnalyticsStreamConfig>,
  startDate: Date,
  endDate: Date,
  nextPageToken: string | null | undefined
): Promise<GAnalyticsReport | undefined> => {
  const dateRange = {
    startDate: startDate.toISOString().substring(0, 10),
    endDate: endDate.toISOString().substring(0, 10),
  };
  const response = await gaClient.reports.batchGet({
    requestBody: {
      reportRequests: [
        {
          viewId: sourceConfig.view_id,
          dimensions: streamConfiguration.parameters.dimensions.map(dimension => ({ name: dimension })),
          metrics: streamConfiguration.parameters.metrics.map(metric => ({ expression: metric })),
          pageSize: 40000,
          pageToken: nextPageToken,
          dateRanges: [dateRange],
        },
      ],
    },
  });
  return response.data.reports?.[0];
};

const getGAEventWithDimensions = (row: GAnalyticsReportRow, dimHeaders: string[]): GAnalyticsEvent => {
  const gaEvent: GAnalyticsEvent = {};
  const dims = row.dimensions ?? [];
  for (let idx = 0; idx < dimHeaders.length && idx < dims.length; idx++) {
    gaEvent[trimPrefix(dimHeaders[idx], GA_FIELDS_PREFIX)] = dims[idx];
  }
  return gaEvent;
};

const getGAEventWithMetrics = (
  row: GAnalyticsReportRow,
  metricHeaders: { name?: string | null }[]
): GAnalyticsEvent => {
  const gaEvent: GAnalyticsEvent = {};
  const metrics = row.metrics ?? [];

  metrics.forEach(metric => {
    const metricValues = metric.values ?? [];
    for (let idx = 0; idx < metricHeaders.length && idx < metricValues.length; idx++) {
      const fieldName = trimPrefix(metricHeaders[idx].name ?? "", GA_FIELDS_PREFIX);
      const stringValue = metricValues[idx];
      const converter = GA_METRICS_CAST[metricHeaders[idx].name ?? ""];
      const value = converter ? converter(stringValue) : stringValue;
      gaEvent[fieldName] = value;
    }
  });

  return gaEvent;
};

const trimPrefix = (value: string, prefix: string): string =>
  value.startsWith(prefix) ? value.slice(prefix.length) : value;

const GA_METRICS_CAST = {
  "ga:sessions": parseInt,
  "ga:users": parseInt,
  "ga:hits": parseInt,
  "ga:visitors": parseInt,
  "ga:bounces": parseInt,
  "ga:goal1Completions": parseInt,
  "ga:goal2Completions": parseInt,
  "ga:goal3Completions": parseInt,
  "ga:goal4Completions": parseInt,
  "ga:adClicks": parseInt,
  "ga:newUsers": parseInt,
  "ga:pageviews": parseInt,
  "ga:uniquePageviews": parseInt,
  "ga:transactions": parseInt,

  "ga:adCost": parseFloat,
  "ga:avgSessionDuration": parseFloat,
  "ga:timeOnPage": parseFloat,
  "ga:avgTimeOnPage": parseFloat,
  "ga:transactionRevenue": parseFloat,
} as const;

const GA_FIELDS_PREFIX = "ga:" as const;
