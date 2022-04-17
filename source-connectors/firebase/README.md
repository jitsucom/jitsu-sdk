# Firebase connector for Jitsu

This dir contains an airtable connector for Jitsu which is based on Jitsu SDK

<hr />

## Dev tips

For testing the connector you'll need `projectId` and [credentials JSON](https://cloud.google.com/iam/docs/creating-managing-service-account-keys).

Run `yarn execute -c "{service_account_key:'XXX', project_id:'XXX'}" -s "{name: 'users'}"` to dump all users

Run `yarn execute -c "{service_account_key:'XXX', project_id:'XXX'}" -s "{name: 'firestore', collection: 'collectionName'}"` to dump firestore collection
