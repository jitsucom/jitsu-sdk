import {JitsuEvent} from "@jitsu/jitsu-types/src/event";
import {adapter} from "../src/index";
import {DestinationMessage} from "@jitsu/jitsu-types/src/destination";

describe('test-destination', function() {
    // [[ name, {event }, { expected result} ]]
    const testData:[[string, JitsuEvent, DestinationMessage]] = [
        ["basic",
            {page_title: "Test Title", local_tz_offset: 180} as JitsuEvent,
            {method: "POST", path: "/test", body: {page_title: "TEST TITLE", local_tz_offset: 180}}
        ]
    ]

    test.each(testData)('%s', (name, event, expectedResult) =>  {
        const result = adapter(event)
        //console.log(result)
        expect(result).toEqual(expectedResult);
    })});