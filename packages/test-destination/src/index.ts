import tsFunction from "./lib";

import {DestinationAdapter, DestinationDescriptor} from "@jitsu/jitsu-types/src/destination";

const adapter: DestinationAdapter = tsFunction

const descriptor: DestinationDescriptor = {
    configurationParameters: [],
    description: "Test destination",
    name: "Test destination"
}


export {descriptor, adapter}



