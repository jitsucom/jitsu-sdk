import { DefaultJitsuEvent } from "@jitsu/types/event";
import { SegmentEvent } from "@segment/analytics-next";
import { JitsuDestinationHints, CanonicalSqlTypeHint, SqlTypeHint, TableObject } from "@jitsu/types/sql-hints";
import { JitsuToSegmentMapper, JitsuToSegmentOpts, SegmentEventType, SegmentTableObject } from "@jitsu/types/segment";
import pkg from "../package.json";
import {
  DataRecord,
  DeleteRecords,
  Granularity,
  JitsuDataMessage,
  JitsuDataMessageType,
  JitsuLogLevel,
  StreamSink,
} from "@jitsu/types/sources";
import { startOfDay, startOfHour, startOfMonth, startOfQuarter, startOfYear } from "date-fns";

export const segmentEventsTypes: Record<SegmentEventType, boolean> = {
  alias: true,
  group: true,
  identify: true,
  page: true,
  screen: true,
  track: true,
};

export const getSegmentType = (
  jitsuType: string,
  customMapping: Record<string, SegmentEventType>,
  defaultSegmentType: SegmentEventType
): SegmentEventType => {
  if (jitsuType === "user_identity" || jitsuType === "identify") {
    return "identify";
  } else if (jitsuType === "page" || jitsuType === "pageview") {
    return "page";
  } else if (segmentEventsTypes[jitsuType] !== undefined) {
    return jitsuType as SegmentEventType;
  } else {
    const customType = customMapping[jitsuType];
    return customType ?? defaultSegmentType;
  }
};

export function removeProps(ev: Record<string, string>, props: string[]) {
  const copy = { ...ev };
  props.forEach(p => delete copy[p]);
  return copy;
}

export const jitsuToSegment: JitsuToSegmentMapper = (
  ev: DefaultJitsuEvent,
  { defaultSegmentType = "track", eventTypeMapping = {} }: JitsuToSegmentOpts = {}
): SegmentEvent => {
  //Event has been intercepted from analytics JS, so original event is included.
  //Just return original Segment event
  if (ev.src_payload && ev.src === "ajs") {
    return ev.src_payload;
  }

  let segmentEvent = {
    type: getSegmentType(ev.event_type, eventTypeMapping, defaultSegmentType),
    _metadata: {},
    anonymousId: ev.user?.anonymous_id,
    //category: "", -- unknown?
    context: {
      ip: ev.source_ip,
      locale: ev.user_language,
      userAgent: ev.user_agent,
      page: {
        path: ev.doc_path,
        referrer: ev.referer,
        search: ev.doc_search,
        title: ev.page_title,
        url: ev.url,
      },
      campaign: {
        name: ev.utm?.name,
        term: ev.utm?.term,
        source: ev.utm?.source,
        medium: ev.utm?.medium,
        content: ev.utm?.content,
      },
    },
    event: ev.event_type,
    groupId: undefined,
    integrations: undefined,
    messageId: ev.event_id,
    name: "",
    properties: flatten(
      removeProps(ev, [
        "user",
        "source_ip",
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
        "parsed_ua",
        "location",
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
      ]),
      { skipArrays: true }
    ) as any,
    sentAt: ev.utc_time ? new Date(ev.utc_time) : new Date(),
    timestamp: ev.utc_time ? new Date(ev.utc_time) : new Date(),
    traits: flatten(removeProps(ev.user || {}, ["anonymous_id", "id"])) as any,
    userId: ev.user?.id || ev.user?.email,
  };
  removeEmptyFields(segmentEvent);
  return segmentEvent;
};

function safeToString(obj: any): string | undefined {
  if (obj === undefined || obj === null) {
    return undefined;
  } else if (typeof obj === "string") {
    return obj;
  } else if (typeof obj === "object") {
    return JSON.stringify(obj);
  } else {
    return obj + "";
  }
}

/**
 * See https://segment.com/docs/connections/storage/warehouses/schema/
 */
const segmentTables: Record<SegmentEventType, string> = {
  track: "tracks",
  page: "pages",
  identify: "identifies",
  group: "groups",
  alias: "aliases",
  screen: "screens",
};

/**
 * Turns Segment object to flat table-like structure with Jitsu Type Hints (see link to documentation above)
 * @param event segment event
 * @param jitsuEvent optional original Jitsu event
 */
export const segmentToTable = (
  event: SegmentEvent,
  jitsuEvent?: DefaultJitsuEvent
): SegmentTableObject & JitsuDestinationHints<SegmentTableObject> => {
  const payloadObj = jitsuEvent?.src_payload?.obj || {};
  return {
    JITSU_TABLE_NAME: segmentTables[event.type] || "tracks",
    __sql_type_timestamp: "timestamp",
    __sql_type_sent_at: "timestamp",

    anonymous_id: safeToString(event.anonymousId) || jitsuEvent?.src_payload?.anonymousId,
    //app: event.app, --- where shall we take app from?
    context_campaign_source: event.context?.campaign?.source,
    context_ip: event.context?.ip,
    context_library_name: jitsuEvent?.context?.library?.version || "jitsu-bridge",
    context_library_version: pkg.version || "unknown",
    context_locale: event.context?.locale || payloadObj.context?.locale,
    context_page_path: event.context?.page?.path,
    context_page_referrer: event.context?.page?.referrer,
    context_page_search: event.context?.page?.search,
    context_page_title: event.context?.page?.title,
    context_page_url: event.context?.page?.url,
    context_user_agent: event.context?.userAgent,
    context_utm_source: event.context?.campaign?.source,
    email: safeToString(event.traits?.email),
    id: event.messageId,
    name: safeToString(event.traits?.name),
    path: event.context?.page?.path,
    referrer: event.context?.page?.referrer,
    search: event.context?.page?.search,
    sent_at: safeToString(event.sentAt),
    timestamp: payloadObj.timestamp || safeToString(event.timestamp),
    title: event.context?.page?.title,
    url: event.context?.page?.url,
    user_id: safeToString(event.userId) || jitsuEvent?.src_payload?.userId,
    ...(event.properties || {}),
  };
};

export function canonicalSqlTypeHint(hint: SqlTypeHint): CanonicalSqlTypeHint {
  if (typeof hint === "object") {
    if (!Array.isArray(hint)) {
      return hint as any as CanonicalSqlTypeHint;
    } else {
      return { defaultCastType: "hint[0]", defaultDDLType: "hint[1]", dialects: {} };
    }
  } else {
    return { defaultCastType: hint, defaultDDLType: hint, dialects: {} };
  }
}

export function removeEmptyFields<T>(obj: T) {
  for (const [key, val] of Object.entries(obj)) {
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      removeEmptyFields(val);
    } else if (val === undefined) {
      delete obj[key];
    }
  }
}

export function flatten(obj: any, { separator = "_", skipArrays = false } = {}, path: string[] = []): TableObject {
  if (typeof obj !== "object") {
    throw new Error(`Can't flatten an object, expected object, but got" ${typeof obj}`);
  }
  if (obj === null) {
    throw new Error(`Can't flatten null value`);
  }
  if (Array.isArray(obj)) {
    if (!skipArrays) {
      throw new Error(`Can't flatten array`);
    } else {
      return {};
    }
  }
  const res = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "object") {
      Object.entries(flatten(value, { separator, skipArrays }, [...path, key])).forEach(
        ([subKey, subValue]) => (res[key + separator + subKey] = subValue)
      );
    } else if (typeof value == "function") {
      throw new Error(`Can't flatten object with function as a value of ${key}. Path to node: ${path.join(".")}`);
    } else {
      res[key] = value;
    }
  }
  return res;
}

export const stdoutStreamSink: StreamSink = {
  addRecord(record: DataRecord) {
    this.msg({ type: "record", message: record });
  },
  changeState(newState: Record<string, any>) {
    this.msg({ type: "state", message: newState });
  },
  log(level: JitsuLogLevel, message: string) {
    this.msg({ type: "log", message: { level: level, message: message } });
  },
  clearStream() {
    this.msg({ type: "clear_stream" });
  },
  deleteRecords(partitionTimestamp: Date, granularity: Granularity) {
    this.msg({
      type: "delete_records",
      message: {
        whenCondition: {
          partitionTimestamp: partitionTimestamp,
          granularity: granularity,
        },
      },
    });
  },
  newTransaction() {
    this.msg({ type: "new_transaction" });
  },
  msg<T extends JitsuDataMessageType, P>(msg: JitsuDataMessage<T, P>) {
    console.log(JSON.stringify(msg));
  },
};

function startOfPartition(date: Date, granularity: Granularity) {
  switch (granularity) {
    case "HOUR":
      return startOfHour(date);
    case "DAY":
      return startOfDay(date);
    case "MONTH":
      return startOfMonth(date);
    case "QUARTER":
      return startOfQuarter(date);
    case "YEAR":
      return startOfYear(date);
    default:
      throw new Error("Unknown granularity: " + granularity);
  }
}

export const chunkedStreamSink = (streamSink: StreamSink, granularity: Granularity) => {
  return {
    ...streamSink,
    currentChunk: new Date(0),
    addRecord(record: DataRecord) {
      if (typeof record.$recordTimestamp === "undefined") {
        throw new Error("chunkedStreamSink requires all record to have $recordTimestamp parameter set.");
      }
      const chunkStart = startOfPartition(record.$recordTimestamp, granularity);
      if (this.currentChunk.getTime() !== chunkStart.getTime()) {
        this.currentChunk = chunkStart;
        streamSink.log("INFO", "Loading chunk for " + granularity + " of " + chunkStart.toISOString());
        streamSink.newTransaction();
        streamSink.deleteRecords(record.$recordTimestamp, granularity);
      }
      return streamSink.addRecord(record);
    },
  };
};
