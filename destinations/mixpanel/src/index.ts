import {jitsuMixpanel, MixpanelDestinationConfig} from "./jitsu-mixpanel";
import {ConfigValidator, DestinationFunction, ExtensionDescriptor} from "@jitsu/types/extension";

const destination: DestinationFunction = jitsuMixpanel

const validator: ConfigValidator<MixpanelDestinationConfig> = async (config) => {
    ['token', 'api_secret', 'project_id'].forEach(prop => {
        if (config[prop] === undefined) {
            throw new Error(`Required property '${prop}' is absent in config. Present props: ${Object.keys(config)}`);
        }
    })
    let res = await fetch(`https://mixpanel.com/api/app/validate-project-credentials/`, {
        method: 'post',
        body: JSON.stringify({
            api_secret: config.api_secret,
            project_token: config.token
        })
    });

    if (res.headers?.get('Content-Type') === "application/json") {
        let json = await res.json();
        if (json.status === 'ok') {
            return {ok: true}
        } else {
            return {ok: false, message: json.error}
        }
    } else {
        return {ok: false, message: `Error Code: ${res.status} msg: ${await res.text()}`}
    }
}

const descriptor: ExtensionDescriptor<MixpanelDestinationConfig> = {
    id: "jitsu-mixpanel-destination",
    displayName: "Mixpanel",
    icon: "",
    description: "Jitsu can send events from JS SDK or Events API to Mixpanel Ingestion API filling as much Mixpanel Events " +
        "Properties as possible from original event data.",
    configurationParameters: [
        {
            id: "token",
            type: "string",
            required: true,
            displayName: "Project Token",
            documentation: "<a href=\"https://developer.mixpanel.com/reference/project-token\">Project Token</a>. A project's token can be\n" +
                "          found in the Access Keys section of a project's settings overview page:{\" \"}\n" +
                "          <a href=\"https://mixpanel.com/settings/project/\">https://mixpanel.com/settings/project/</a>",
        },
        {
            id: "users_enabled",
            type: "boolean",
            required: false,
            displayName: "Project Token",
            documentation: "Enables Mixpanel destination to work with User Profiles. <br />" +
                " See <a href=\"https://jitsu.com/docs/destinations-configuration/mixpanel#user-profiles\">User Profiles</a>" +
                " section of Documentation",
        },
        {
            id: "anonymous_users_enabled",
            type: "boolean",
            required: false,
            displayName: "User Profiles for anonymous users",
            documentation: "Enables updating User Profiles for anonymous users. Requires <b>Enable User Profiles</b> enabled",
        },
    ],

}


export {descriptor, destination, validator}



