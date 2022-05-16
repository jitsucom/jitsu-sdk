import { StreamSink } from "@jitsu/types/sources";
import { App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function toISO(strDate: string) {
  return new Date(strDate).toISOString();
}

export async function streamUsers(firebaseApp: App, streamSink: StreamSink) {
  let pageToken: string | undefined = undefined;
  const batchSize = 256;
  let totalUsers = 0;
  while (true) {
    let listResult = await getAuth(firebaseApp).listUsers(batchSize, pageToken);
    totalUsers += listResult.users.length;
    streamSink.log(
      "INFO",
      `Got a batch of ${listResult.users.length} users (${totalUsers} downloaded to this moment). ${
        listResult.pageToken ? "Will continue iteration" : "This is the last batch"
      }`
    );
    streamSink.clearStream();
    listResult.users.forEach(user => {
      streamSink.addRecord({
        __id: user.uid,
        email: user.email,
        uid: user.uid, //duplicated, for backward compatibility,
        phone: user.phone,
        sign_in_methods: user.providerData.map(p => p.providerId),
        sign_in_details: user.providerData.map(p => p),
        disabled: user.disabled,
        created_at: toISO(user.metadata.creationTime),
        last_login: toISO(user.metadata.lastSignInTime),
        last_refresh: toISO(user.metadata.lastRefreshTime),
        __sql_type_created_at: "timestamp with time zone",
        __sql_type_last_login: "timestamp with time zone",
        __sql_type_last_refresh: "timestamp with time zone",
        display_name: user.displayName,
        photo_url: user.photoURL,
        email_verified: user.emailVerified,
      });
    });
    pageToken = listResult.pageToken;
    if (!pageToken) {
      break;
    }
  }
}
