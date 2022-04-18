import {destination} from "../src";
import {testDestination} from "jitsu-cli/lib/tests";
import {JitsuDestinationContext} from "@jitsu/types/extension";

/**
 * Represents context data of configured destination instance
 */
const testContext: JitsuDestinationContext = {
    destinationId: "abc123",
    destinationType: "mixpanel",
    config: {
        token: "123",
        users_enabled: true,
        anonymous_users_enabled: true,
        api_secret: "123",
        project_id: "999"
    },
}

const date = new Date()
const isoDate = date.toISOString()
const epoch = date.getTime()

testDestination({
        name: "site_page",
        context: testContext,
        destination: destination,
        event: {
            _timestamp: isoDate,
            event_type: "site_page",
        },
        expectedResult: [
            {
                "body": JSON.stringify([{
                        "event": "Page View",
                        "properties": {
                            "time": epoch
                        }
                    }]
                ),
                "headers": {
                    "Content-Type": "application/json",
                    "Authorization": "Basic MTIzOg=="
                },
                "method": "POST",
                "url": "https://api.mixpanel.com/import?project_id=999"
            }]
    }
)

testDestination({
        name: "with user",
        context: testContext,
        destination: destination,
        event: {
            _timestamp: isoDate,
            event_type: "Page View",
            user: {
                email: "support@jitsu.com",
                anonymous_id: "1234567"
            }
        },
        expectedResult: [
            {
                "body": JSON.stringify(
                    [{
                        "event": "Page View",
                        "properties": {
                            "time": epoch,
                            "$identified_id": "support@jitsu.com",
                            "$anon_id": "1234567",
                            "$distinct_id": "support@jitsu.com",
                            "distinct_id": "support@jitsu.com",
                            "$email": "support@jitsu.com"
                        }
                    }]
                ),
                "headers": {"Content-Type": "application/json",
                    "Authorization": "Basic MTIzOg=="
                },
                "method": "POST",
                "url": "https://api.mixpanel.com/import?project_id=999"
            },
            {
                "body": "data=" + encodeURIComponent(JSON.stringify(
                    [{
                        "$token": testContext.config.token,
                        "$distinct_id": "support@jitsu.com",
                        "$set": {
                            "Last Page View": isoDate
                        }
                    }, {
                        "$token": testContext.config.token,
                        "$distinct_id": "support@jitsu.com",
                        "$add": {
                            "Page View": 1
                        }
                    }]
                )),
                "headers": {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                "method": "POST",
                "url": "https://api.mixpanel.com/engage"
            }
        ]
    }
)

