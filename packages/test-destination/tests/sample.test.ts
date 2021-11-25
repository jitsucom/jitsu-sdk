import {adapter} from "../src/index";
import {DestinationContext} from "@jitsu/jitsu-types/src/destination";
import {testDestination} from "@jitsu/jitsu-types";

/**
 * Represents context data of configured destination instance
 */
const testContext: DestinationContext = {
    destinationId: "abc123",
    destinationType: "mydest",
    baseUrl: "https://example.com/api"
}

testDestination({
        name: "basic",
        context: testContext,
        transform: ($, context) => adapter($, context),
        event: {
            event_type: "page_view",
            page_title: "Test Title",
            local_tz_offset: 180
        },
        expectedResult: {
            method: "POST",
            url: "https://example.com/api/page",
            headers: {
                "Content-Type": "application/json"
            },
            body: {event_type: "page_view", page_title: "Test Title", local_tz_offset: 180, destinationId: "abc123"}
        }
    }
)

testDestination({
        name: "multiplexing",
        context: testContext,
        transform: ($, context) => adapter($, context),
        event: {
            event_type: "conversion",
            products: [
                {id: 1, price: 11.3},
                {id: 2, price: 7.3},
            ]
        },
        expectedResult: [
            {
                method: "POST",
                url: "https://example.com/api/purchase",
                headers: {"Content-Type": "application/json"},
                body: {event_type: "purchase", product_id: 1, price: 11.3}
            },
            {
                method: "POST",
                url: "https://example.com/api/purchase",
                headers: {"Content-Type": "application/json"},
                body: {event_type: "purchase", product_id: 2, price: 7.3}
            },
        ]
    }
)

testDestination({
        "name": "skipping",
        context: testContext,
        transform: ($, context) => adapter($, context),
        "event": {
            event_type: "not_interesting",
            page_title: "Test Title2",
            local_tz_offset: 180
        },
        "expectedResult": null
    }
)