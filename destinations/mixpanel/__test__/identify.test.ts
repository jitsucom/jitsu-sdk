import {destination} from "../src";
import {JitsuDestinationContext} from "@jitsu/types/extension";
import {testDestination} from "jitsu-cli/lib/tests";
import {MixpanelDestinationConfig} from "../src/jitsu-mixpanel";

/**
 * Represents context data of configured destination instance
 */
const testContext: JitsuDestinationContext<MixpanelDestinationConfig> = {
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
        name: "identify",
        context: testContext,
        destination: destination,
        event: {
            _timestamp: isoDate,
            event_type: "identify",
            user: {
                email: "support@jitsu.com",
                anonymous_id: "1234567"
            }
        },
        expectedResult: [
            {
                "body": JSON.stringify(
                    [{
                        "event": "$create_alias",
                        "properties": {
                            "alias": "1234567",
                            "distinct_id": "support@jitsu.com"
                        }
                    }]
                ),
                "headers": {
                    "Content-Type": "application/json",
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
                            "$email": "support@jitsu.com"
                        }
                    }, {
                        "$token": testContext.config.token,
                        "$distinct_id": "support@jitsu.com",
                        "$set_once": {
                            "$initial_referrer": "$direct",
                            "$initial_referring_domain": "$direct"
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