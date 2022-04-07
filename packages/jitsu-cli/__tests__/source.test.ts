import { ConfigValidationResult, ExtensionDescriptor, JitsuExtensionExport } from "@jitsu/types/extension";
import { ConfigurationParameter } from "@jitsu/types/parameters";
import {
  DataRecord,
  PermanentStorage,
  SourceFunctions,
  StreamConfigurationParameters,
  StreamSink,
} from "@jitsu/types/source";
import Airtable from "airtable";
import { flatten } from "@jitsu/pipeline-helpers";
import { getDataFromStream } from "../src/lib/source/runner";
import { validateConfiguration } from "../src/lib/validator-helper";


import * as airtableSource from '../src/airtable'




test("test sources interface", async () => {
  let config = {
    apiKey: "keyqJy9Est2CAlIzI",
    baseId: "appaxnthNVaPILEQx",
  };
  if (airtableSource.validator) {
    let error = await validateConfiguration(config, airtableSource.validator);
    if (error) {
      throw new Error(`Config is not valid: ${error}`)
    }
  }
  try {
    console.table(await getDataFromStream<airtableSource.AirtableConfig>(
      config,
      { tableId: "tblztAjzIpJ2vr5tx" },
      airtableSource.source
    ));
  } catch (e: any) {
    let msg = "Failed to get data from stream: " + e?.message;
    console.error(msg)
    throw new Error(msg);
  }
});
