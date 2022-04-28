# Google Analytics connector for Jitsu

This dir contains a Google Analytics connector for Jitsu which is based on Jitsu SDK

<hr />

## Dev tips

For testing the connector you'll need either OAuth or [Service Account](https://cloud.google.com/iam/docs/creating-managing-service-account-keys) credentials.
1. Testing using OAuth:
- 
- Run
  ```bash
  yarn execute -c '{\
    "view_id": "XXX",\
    "auth.type":"OAuth",\
    "auth.client_id":"XXX",\ 
    "auth.client_secret": "XXX",\
    "auth.refresh_token": "XXX"\
  }' -s '{\
    dimensions: [
      "ga:dateHourMinute",\
      "ga:pagePath",\
      "ga:operatingSystem",\
      "ga:browser",\
      "ga:country",\
      "ga:source"\
    ]\,
    metrics: [
      "ga:pageviews",\
      "ga:totalEvents",\
      "ga:users"\
    ]\
  }'
  ```
to dump the data to stdout and make sure the data looks good
2. Testing using Service Account
- Run `yarn execute -c "{apiKey:'XXX', baseId:'XXX'}" -s "{tableId:'XXXX'}"` to dump the table to stdout and make sure the data looks good