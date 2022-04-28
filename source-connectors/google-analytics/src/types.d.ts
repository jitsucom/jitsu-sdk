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
