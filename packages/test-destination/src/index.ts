import * as _ from "lodash";
import {DestinationAdapter, DestinationDescriptor} from "@jitsu/jitsu-types/src/destination";
import tsFunction from "./lib";

const adapter: DestinationAdapter = (event) => {
    _.set(event, "a.b.c", tsFunction("2"))
    return [];
}

const descriptor: DestinationDescriptor = {
    configurationParameters: [],
    description: "Test destination",
    name: "Test destination"
}


export {descriptor, adapter}



