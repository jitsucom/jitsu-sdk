import { ExtensionDescriptor, TransformationFunction } from "@jitsu/types/extension";
import { DefaultJitsuEvent } from "@jitsu/types/event";
import { jitsuToSegment, segmentToTable } from "@jitsu/pipeline-helpers/lib";

const descriptor: ExtensionDescriptor = {
  configurationParameters: [],
  description: "",
  displayName: "",
  id: "@jitsu",
};

const transform: TransformationFunction = (event: DefaultJitsuEvent) => {
  return segmentToTable(jitsuToSegment(event), event);
};

export { descriptor, transform };
