import { googleAnalyticsDimensions } from "./dimensions";
import { googleAnalyticsMetrics } from "./metrics";
import type { SourceCatalog } from "@jitsu/types/sources";

export const googleAnalyticsSourceCatalog: SourceCatalog<
  GoogleAnalyticsConfig,
  GoogleAnalyticsStreamConfig
> = async config => {
  return [
    {
      type: "report",
      supportedModes: ["incremental"],
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
            max: 10,
          },
          documentation:
            "Use this tool to check metrics compatibility: https://ga-dev-tools.appspot.com/dimensions-metrics-explorer/",
          required: false,
        },
      ],
    },
  ];
};
