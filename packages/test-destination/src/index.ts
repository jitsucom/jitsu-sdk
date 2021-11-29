import transformFunction from "./transform"

import { DestinationAdapter, DestinationDescriptor } from "@jitsu/jitsu-types/src/destination"

const adapter: DestinationAdapter = transformFunction

const descriptor: DestinationDescriptor = {
  type: "test",
  displayName: "Test destination",
  description:
    "Example project. Can be used as a template for new destinations." +
    "Transformation logic is located in transform.ts file",
  configurationParameters: [
    {
      id: "baseUrl",
      type: "string",
      required: true,
      displayName: "Base URL",
      documentation: "Base URL of API server",
    },
  ],
}

export { descriptor, adapter }
