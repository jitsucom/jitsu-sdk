import {JitsuEvent} from "@jitsu/jitsu-types/src/event";
import {DestinationMessage} from "@jitsu/jitsu-types/src/destination";
import * as console from "console";

export default function tsFunction(event: JitsuEvent) : DestinationMessage[] | DestinationMessage {
    const body = Object.entries(event).map(([key, val]) => {
        if (typeof val === "string") {
            val = val.toUpperCase()
        }

        return [key, val] as [string, any]
    }).reduce((accumulator: any, current: [string, any]) => {
        accumulator[current[0]] = current[1]
        return accumulator
    }, {} )
    return {method: "POST", path: "/test", body: body}
}