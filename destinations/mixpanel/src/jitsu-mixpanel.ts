import {DefaultJitsuEvent} from "@jitsu/types/event";
import {DestinationFunction, DestinationMessage, JitsuDestinationContext} from "@jitsu/types/extension";
import {flatten, removeProps} from "@jitsu/jlib/lib";

var Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(e){var t="";var n,r,i,s,o,u,a;var f=0;e=Base64._utf8_encode(e);while(f<e.length){n=e.charCodeAt(f++);r=e.charCodeAt(f++);i=e.charCodeAt(f++);s=n>>2;o=(n&3)<<4|r>>4;u=(r&15)<<2|i>>6;a=i&63;if(isNaN(r)){u=a=64}else if(isNaN(i)){a=64}t=t+this._keyStr.charAt(s)+this._keyStr.charAt(o)+this._keyStr.charAt(u)+this._keyStr.charAt(a)}return t},decode:function(e){var t="";var n,r,i;var s,o,u,a;var f=0;e=e.replace(/[^A-Za-z0-9\+\/\=]/g,"");while(f<e.length){s=this._keyStr.indexOf(e.charAt(f++));o=this._keyStr.indexOf(e.charAt(f++));u=this._keyStr.indexOf(e.charAt(f++));a=this._keyStr.indexOf(e.charAt(f++));n=s<<2|o>>4;r=(o&15)<<4|u>>2;i=(u&3)<<6|a;t=t+String.fromCharCode(n);if(u!=64){t=t+String.fromCharCode(r)}if(a!=64){t=t+String.fromCharCode(i)}}t=Base64._utf8_decode(t);return t},_utf8_encode:function(e){e=e.replace(/\r\n/g,"\n");var t="";for(var n=0;n<e.length;n++){var r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r)}else if(r>127&&r<2048){t+=String.fromCharCode(r>>6|192);t+=String.fromCharCode(r&63|128)}else{t+=String.fromCharCode(r>>12|224);t+=String.fromCharCode(r>>6&63|128);t+=String.fromCharCode(r&63|128)}}return t},_utf8_decode:function(e){var t="";var n=0;var r=0,c1=0,c2=0;while(n<e.length){r=e.charCodeAt(n);if(r<128){t+=String.fromCharCode(r);n++}else if(r>191&&r<224){c2=e.charCodeAt(n+1);t+=String.fromCharCode((r&31)<<6|c2&63);n+=2}else{c2=e.charCodeAt(n+1);let c3=e.charCodeAt(n+2);t+=String.fromCharCode((r&15)<<12|(c2&63)<<6|c3&63);n+=3}}return t}}


export type MixpanelDestinationConfig = {
    anonymous_users_enabled?: boolean,
    users_enabled?: boolean,

    token: string,
    api_secret: string,
    project_id: string
}


export const jitsuMixpanel: DestinationFunction<DefaultJitsuEvent, MixpanelDestinationConfig> =  (event: DefaultJitsuEvent, dstContext: JitsuDestinationContext<MixpanelDestinationConfig>) => {
    const context = event.eventn_ctx || event;
    const user = context.user || {};
    const utm = context.utm || {};
    const location = context.location || {};
    const ua = context.parsed_ua || {};
    const conversion = context.conversion || {};

    const matches = context.referer?.match(
        /^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i
    );
    const refDomain = matches && matches[1]; // domain will be null if no match is found

    const config = dstContext.config
    const Authorization = `Basic ${Base64.encode(config.api_secret + ":")}`

    const mustUpdateUserProfile =
        config.users_enabled &&
        (user.id || user.internal_id || user.email || (config.anonymous_users_enabled && (user.anonymous_id || user.hashed_anonymous_id)));

    function getEventType($) {
        switch ($.event_type) {
            case "user_identify":
            case "identify":
                return "$identify";
            case "page":
            case "pageview":
            case "site_page":
                return "Page View";
            default:
                return $.event_type;
        }
    }

    const eventType = getEventType(event);

    let envelops:DestinationMessage[] = [];
    let $set = {};
    let $set_once = {};
    let $add = {};

    //on identify
    if (eventType === "$identify") {
        //create an alias user id -> anon id
        if (
            (user.id ||user.internal_id || user.email) &&
            (user.anonymous_id || user.hashed_anonymous_id)
        ) {
            envelops.push({
                    url: "https://api.mixpanel.com/import?project_id=" + config.project_id,
                    method: "POST",
                    headers: {
                        Authorization,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify([{
                                event: "$create_alias",
                                properties: {
                                    alias: user.anonymous_id || user.hashed_anonymous_id,
                                    distinct_id: user.id || user.internal_id || user.email
                                },
                            }])
                });
        }

        if (mustUpdateUserProfile) {
            $set = {
                $email: user.email,
                $name: user.name,
                $username: user.username,
                $first_name: user.firstName || user.first_name,
                $last_name: user.lastName || user.last_name,
                $phone: user.phone,
                $avatar: user.avatar,
                $country_code: location.country,
                $city: location.city,
                $region: location.region,
                $browser: ua.ua_family,
                $browser_version: ua.ua_version,
                $os: ua.os_family,
                $referring_domain: refDomain,
            };
            //Set User Profile Properties Once
            $set_once = {
                $initial_referrer: context.referer || "$direct",
                $initial_referring_domain: refDomain || "$direct",
            };
        }
    }
    if (eventType !== "$identify") {
        let additionalProperties = flatten(
            removeProps(event, [
                "user",
                "source_ip",
                "parsed_ua",
                "location",
                "user_language",
                "user_agent",
                "doc_path",
                "referer",
                "doc_search",
                "page_title",
                "url",
                "event_type",
                "event_id",
                "utc_time",
                "_timestamp",
                "eventn_ctx_event_id",
                "utm",
                "eventn_ctx",
                "api_key",
                "app",
                "doc_encoding",
                "doc_host",
                "ids",
                "local_tz_offset",
                "screen_resolution",
                "src",
                "vp_size",
                "src_payload",
                "revenue"
            ])
            , {skipArrays: true}
        )

        envelops.push({
                url: "https://api.mixpanel.com/import?project_id=" + config.project_id,
                method: "POST",
                headers: {
                    Authorization,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify([{
                            event: eventType,
                            properties: {
                                time: new Date(event._timestamp).getTime(),
                                $insert_id: event.eventn_ctx_event_id || context.event_id,
                                $current_url: context.url,
                                $referrer: context.referer,
                                $referring_domain: refDomain,
                                $identified_id: user.id || user.internal_id || user.email,
                                $anon_id: user.anonymous_id || user.hashed_anonymous_id,
                                $distinct_id:
                                    user.id || user.internal_id ||
                                    user.email ||
                                    user.anonymous_id ||
                                    user.hashed_anonymous_id,
                                distinct_id:
                                    user.id || user.internal_id ||
                                    user.email ||
                                    user.anonymous_id ||
                                    user.hashed_anonymous_id,
                                $email: user.email,
                                ip: event.source_ip,
                                $browser: ua.ua_family,
                                $browser_version: ua.ua_version,
                                $os: ua.os_family,
                                $city: location.city,
                                $region: location.region,
                                $country_code: location.country,
                                mp_country_code: location.country,
                                $screen_width: context.screen_resolution?.split("x")[0],
                                $screen_height: context.screen_resolution?.split("x")[1],
                                utm_medium: utm.medium,
                                utm_source: utm.source,
                                utm_campaign: utm.campaign,
                                utm_content: utm.content,
                                utm_term: utm.term,
                                Revenue: conversion.revenue || event.revenue,
                                ...additionalProperties
                            },
                        }])
            });

        if (mustUpdateUserProfile) {
            $set = {
                [`Last ${eventType}`]: event._timestamp,
            };
            $add = {
                [eventType]: 1,
            };
            if (conversion.revenue || event.revenue) {
                $add["Lifetime Revenue"] = conversion.revenue || event.revenue;
            }
        }
    }

    if (mustUpdateUserProfile) {
        //Set User Profile Properties

        let userProfileUpdates = {
            $set,
            $set_once,
            $add,
        };

        //Make a separate API request for engageObject properties.
        //Use batch update for updating multiple properties with one request
        let engages = [];
        Object.keys(userProfileUpdates).forEach((key) => {
            const engage = userProfileUpdates[key];

            if (Object.keys(engage).length > 0) {
                engages.push({
                    $token: config.token,
                    $distinct_id:
                        user.id || user.internal_id ||
                        user.email ||
                        user.anonymous_id ||
                        user.hashed_anonymous_id,
                    $ip: event.source_ip,
                    [key]: engage,
                });
            }
        });
        if (engages.length > 0) {
            envelops.push({
                    url: "https://api.mixpanel.com/engage",
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: "data=" + encodeURIComponent(JSON.stringify(engages)),
                });
        }
    }
    return envelops;
}
