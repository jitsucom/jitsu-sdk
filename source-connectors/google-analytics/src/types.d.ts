interface GoogleAnalyticsConfig {
  view_id: string;
  "auth.type": "OAuth" | "Service Account";
  "auth.client_secret"?: string;
  "auth.refresh_token"?: string;
  "auth.client_id"?: string;
  "auth.service_account_key"?: string;
}
interface GoogleAnalyticsStreamConfig {
  dimensions: string[];
  metrics: string[];
}

/**
 * `keys` - dimensions or metrics name
 * `values` - respective dimension or metric report
 */
 type GAnalyticsEvent = Map<string, any>;

/**
 * Resolves `Promise<T>` type to `T` type
 * @todo move to Jitsu types */
type Resolve<T> = T extends Promise<infer A> ? A : T;
