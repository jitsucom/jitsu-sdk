import { DestinationFunction, DestinationMessage, JitsuDestinationContext, ObjectSet } from "./extension";
import { DefaultJitsuEvent } from "./event";

export declare type DestinationTestParams = {
  name: string;
  context: JitsuDestinationContext;
  destination: DestinationFunction;
  event: DefaultJitsuEvent;
  expectedResult: ObjectSet<DestinationMessage>;
};
