import { DestinationFunction, DestinationMessage, JitsuDestinationContext, ObjectSet } from "./extension";
import { JitsuEvent } from "./event";

export declare type DestinationTestParams = {
  name: string;
  context: JitsuDestinationContext;
  destination: DestinationFunction;
  event: JitsuEvent;
  expectedResult: ObjectSet<DestinationMessage>;
};
