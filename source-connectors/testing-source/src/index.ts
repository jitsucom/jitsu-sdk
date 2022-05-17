import { SourceCatalog, StreamReader, StreamSink, StreamConfiguration } from "@jitsu/types/sources";
import { ConfigValidationResult, ExtensionDescriptor } from "@jitsu/types/extension";

export interface TestingConfig {
  data: string;
}

const descriptor: ExtensionDescriptor<TestingConfig> = {
  id: "testing-source",
  displayName: "Testing Source",
  description: "Source for integration testing",
  configurationParameters: [
    {
      id: "data",
      displayName: "Dummy data",
      documentation: "Dummy data",
      required: true,
    },
  ],
};

async function validator(config: TestingConfig): Promise<ConfigValidationResult> {
  if (config.data) {
    return true
  }

  throw new Error("data must not be empty")
}

const sourceCatalog: SourceCatalog<TestingConfig, TestingConfig> = async (config: TestingConfig) => {
  return [];
};

const streamReader: StreamReader<TestingConfig, TestingConfig> = async (
  sourceConfig: TestingConfig,
  streamType: string,
  streamConfiguration: StreamConfiguration<TestingConfig>,
  streamSink: StreamSink
) => {
  streamSink.addRecord({
    __id: "1",
    data: sourceConfig.data,
  })

  streamSink.addRecord({
    __id: "2",
    data: sourceConfig.data,
  })
};

export { sourceCatalog, streamReader, descriptor, validator };
