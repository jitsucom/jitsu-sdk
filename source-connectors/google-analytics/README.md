# Google Analytics connector for Jitsu

This dir contains a Google Analytics connector for Jitsu which is based on Jitsu SDK

<hr />

## Dev tips

For testing the connector you'll need either __OAuth__ or [__Service Account__](https://cloud.google.com/iam/docs/creating-managing-service-account-keys) credentials.

* Testing using OAuth:
  * You'll need to provide Client Secret / Client Id (you can obtain in in Google Cloud Console) and get a refresh token. Jitsu developed a small [CLI utility to obtain Google OAuth tokens](https://github.com/jitsucom/oauthcli)
  * To dump the data to stdout and make sure the data looks good run the following:
    ```bash
    yarn execute -c '{ "view_id" : "XXX", "auth.type" : "OAuth", "auth.client_id" : "XXX", "auth.client_secret" : "XXX", "auth.refresh_token" : "XXX" }' -s '{ dimensions: ["ga:dateHourMinute", "ga:pagePath", "ga:operatingSystem", "ga:browser", "ga:country", "ga:source"], metrics:["ga:pageviews", "ga:totalEvents", "ga:users"]}'
    ```
  
* Testing using Service Account
  * [Create a service account in Google Cloud Console](https://cloud.google.com/iam/docs/creating-managing-service-account-keys)
  * Share google resource (such as document or analytics property) with this account (account email will look like `[username]@jitsu-customers.iam.gserviceaccount.com`)
  * To dump the data to stdout and make sure the data looks good run the source with your Service Account JSON key as shown below: 
    ```bash
    yarn execute -c '{ "view_id" : "XXX", "auth.type" : "Service Account", "auth.service_account_key": "{ \"type\": \"service_account\", \"project_id\": \"tracker-XXX\", \"private_key_id\": \"XXX\", \"private_key\": \"-----BEGIN PRIVATE KEY-----\nXXX\n-----END PRIVATE KEY-----\n\", \"client_email\": \"XXX\", \"client_id\": \"XXX\", \"auth_uri\": \"XXX\", \"token_uri\": \"XXX", \"auth_provider_x509_cert_url\": \"XXX\", \"client_x509_cert_url\": \"XXX" }" }' -s '{ dimensions: ["ga:dateHourMinute", "ga:pagePath", "ga:operatingSystem", "ga:browser", "ga:country", "ga:source"], metrics:["ga:pageviews", "ga:totalEvents", "ga:users"]}'
    ```