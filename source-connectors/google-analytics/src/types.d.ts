interface GoogleAnalyticsConfig {
  view_id: string;
  refresh_window_days?: number;
  auth_type: "OAuth" | "Service Account";
  client_secret?: string;
  refresh_token?: string;
  client_id?: string;
  service_account_key?: string;
}
interface GoogleAnalyticsStreamConfig {
  dimensions: string[];
  metrics: string[];
}

/**
 * `keys` - dimensions or metrics name
 * `values` - respective dimension or metric report
 */
type GAnalyticsEvent = Record<string, any>;

/**
 * Resolves `Promise<T>` type to `T` type
 * @todo move to Jitsu types */
type Resolve<T> = T extends Promise<infer A> ? A : T;
