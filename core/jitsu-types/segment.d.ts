import { DataWarehousePrimitive, TableObject } from "./sql-hints";
import { DefaultJitsuEvent } from "./event";
import { SegmentEvent } from "@segment/analytics-next";

/**
 * Segment types. Due to lack of explicit typing in @segment/analytics-next, we need
 * to implement it here
 */
export declare type SegmentEventType = "track" | "page" | "identify" | "group" | "alias" | "screen";

/**
 * A type that defines a final schema of SQL table generated by segment
 */
export declare interface SegmentTableObject extends TableObject {
  name?: string;
  title?: string;
  url?: string;
  user_id?: string;
  anonymous_id?: string;
  context_library_version?: string;
  context_page_referrer?: string;
  context_page_url?: string;
  context_user_agent?: string;
  referrer?: string;
  context_page_search?: string;
  timestamp?: string;
  context_ip?: string;
  context_library_name?: string;
  id?: string;
  sent_at?: string;
  context_locale?: string;
  context_page_path?: string;
  context_page_title?: string;
  email?: string;
  context_campaign_source?: string;
  app?: string;
  path?: string;
  search?: string;
  context_utm_source?: string;
  [property: string]: DataWarehousePrimitive;
}

/**
 * Optional settings for JitsuToSegmentMapper
 */
export declare type JitsuToSegmentOpts = {
  /**
   * Costum mapping between Jitsu event type and Segment event type
   */
  eventTypeMapping?: Record<string, SegmentEventType>;
  /**
   * Default event type if mapping has not been found (nor in eventTypeMapping, neither in default mappings)
   */
  defaultSegmentType?: SegmentEventType;
};

/**
 * Function that maps Jitsu Object Event => Segment Event
 */
export declare type JitsuToSegmentMapper = (event: DefaultJitsuEvent, opts?: JitsuToSegmentOpts) => SegmentEvent;

export declare type SegmentToJitsuOpts = {};

/**
 * Function that maps Jitsu Object Event to Segment Event
 */
export declare type SegmentToJitsuMapper = (event: DefaultJitsuEvent, opts?: SegmentToJitsuOpts) => SegmentEvent;